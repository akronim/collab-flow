import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAuthApiClient, authApiClient } from '@/services/authApiClient'
import axios from 'axios'

vi.mock(`axios`, () => ({
  default: {
    create: vi.fn(() => ({
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
      },
      request: vi.fn(),
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn()
    }))
  }
}))

const MOCK_URL = `http://mock.url`

describe(`createAuthApiClient`, () => {
  const mockCreate = vi.mocked(axios.create)

  beforeEach(() => {
    vi.clearAllMocks()
    if (authApiClient.setRefreshTokenFn) {
      // @ts-expect-error: Reset the shared module-level state for test isolation.
      authApiClient.setRefreshTokenFn(undefined)
    }
    if (authApiClient.setGetTokenFn) {
      // @ts-expect-error: Reset the shared module-level state for test isolation.
      authApiClient.setGetTokenFn(undefined)
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it(`creates instance with correct config`, () => {
    createAuthApiClient(MOCK_URL)

    expect(mockCreate).toHaveBeenCalledWith({
      baseURL: MOCK_URL,
      timeout: 10000
    })
  })

  describe(`request interceptor`, () => {
    it(`adds Authorization header when getTokenFn returns a token`, () => {
      const instance = createAuthApiClient(MOCK_URL)
      instance.setGetTokenFn(() => `fake-internal-token`)

      const useSpy = mockCreate.mock.results[0]?.value.interceptors.request.use
      const handler = useSpy.mock.calls[0]?.[0]
      const config = { headers: {} }
      const result = handler(config)

      expect(result.headers.Authorization).toBe(`Bearer fake-internal-token`)
    })

    it(`does not add Authorization header when getTokenFn returns null`, () => {
      const instance = createAuthApiClient(MOCK_URL)
      instance.setGetTokenFn(() => null)

      const useSpy = mockCreate.mock.results[0]?.value.interceptors.request.use
      const handler = useSpy.mock.calls[0]?.[0]
      const config = { headers: {} }
      const result = handler(config)

      expect(result.headers.Authorization).toBeUndefined()
    })

    it(`does not add Authorization header when getTokenFn is not set`, () => {
      createAuthApiClient(MOCK_URL)

      const useSpy = mockCreate.mock.results[0]?.value.interceptors.request.use
      const handler = useSpy.mock.calls[0]?.[0]
      const config = { headers: {} }
      const result = handler(config)

      expect(result.headers.Authorization).toBeUndefined()
    })

    it(`preserves existing headers`, () => {
      const instance = createAuthApiClient(MOCK_URL)
      instance.setGetTokenFn(() => `fake-token`)

      const useSpy = mockCreate.mock.results[0]?.value.interceptors.request.use
      const handler = useSpy.mock.calls[0]?.[0]
      const config = { headers: { 'Content-Type': `application/json` } }
      const result = handler(config)

      expect(result.headers[`Content-Type`]).toBe(`application/json`)
      expect(result.headers.Authorization).toBe(`Bearer fake-token`)
    })
  })

  it(`registers request interceptor`, () => {
    createAuthApiClient(MOCK_URL)

    const instance = mockCreate.mock.results[0]?.value

    expect(instance.interceptors.request.use).toHaveBeenCalledTimes(1)
    expect(instance.interceptors.request.use).toHaveBeenCalledWith(
      expect.any(Function)
    )
  })

  describe(`response interceptor (401 retry)`, () => {
    it(`retries request with fresh token on 401`, async () => {
      const mockRefreshToken = vi.fn().mockResolvedValue(`new-token`)
      const instance = createAuthApiClient(MOCK_URL)
      instance.setRefreshTokenFn(mockRefreshToken)

      const responseUseSpy = mockCreate.mock.results[0]?.value.interceptors.response.use
      const errorHandler = responseUseSpy.mock.calls[0]?.[1]
      const mockRequest = mockCreate.mock.results[0]?.value.request

      const errorConfig = { headers: { Authorization: `Bearer old-token` } }
      const error = { response: { status: 401 }, config: errorConfig }

      mockRequest.mockResolvedValue({ data: `success` })

      const result = await errorHandler(error)

      expect(mockRefreshToken).toHaveBeenCalledTimes(1)
      expect(mockRequest).toHaveBeenCalledWith(expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer new-token` })
      }))
      expect(result).toStrictEqual({ data: `success` })
    })

    it(`rejects with a specific error if refresh returns null`, async () => {
      const mockRefreshToken = vi.fn().mockResolvedValue(null)
      const instance = createAuthApiClient(MOCK_URL)
      instance.setRefreshTokenFn(mockRefreshToken)

      const responseUseSpy = mockCreate.mock.results[0]?.value.interceptors.response.use
      const errorHandler = responseUseSpy.mock.calls[0]?.[1]

      const error = {
        response: { status: 401 },
        config: { headers: {} }
      }

      await expect(errorHandler(error)).rejects.toThrow(`Token refresh failed`)
      expect(mockRefreshToken).toHaveBeenCalledTimes(1)
      expect(mockCreate.mock.results[0]?.value.request).not.toHaveBeenCalled()
    })

    it(`rejects if no refreshToken function provided`, async () => {
      createAuthApiClient(MOCK_URL)

      const instance = mockCreate.mock.results[0]?.value
      const responseUseSpy = instance.interceptors.response.use
      const errorHandler = responseUseSpy.mock.calls[0]?.[1]

      const error = {
        response: { status: 401 },
        config: { headers: {} }
      }

      await expect(errorHandler(error)).rejects.toStrictEqual(error)
    })

    it(`passes through non-401 errors`, async () => {
      const mockRefreshToken = vi.fn()
      const instance = createAuthApiClient(MOCK_URL)
      instance.setRefreshTokenFn(mockRefreshToken)

      const responseUseSpy = mockCreate.mock.results[0]?.value.interceptors.response.use
      const errorHandler = responseUseSpy.mock.calls[0]?.[1]

      const error = {
        response: { status: 500 },
        config: { headers: {} }
      }

      await expect(errorHandler(error)).rejects.toStrictEqual(error)
      expect(mockRefreshToken).not.toHaveBeenCalled()
    })

    it(`registers response interceptor`, () => {
      createAuthApiClient(MOCK_URL)

      const instance = mockCreate.mock.results[0]?.value

      expect(instance.interceptors.response.use).toHaveBeenCalledTimes(1)
      expect(instance.interceptors.response.use).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function)
      )
    })

    it(`handles concurrent 401s by debouncing refresh token call`, async () => {
      /* eslint-disable vitest/max-expects */

      const mockRefreshToken = vi.fn().mockResolvedValue(`new-token`)
      const instance = createAuthApiClient(MOCK_URL)
      instance.setRefreshTokenFn(mockRefreshToken)

      const responseUseSpy = mockCreate.mock.results[0]?.value.interceptors.response.use
      const errorHandler = responseUseSpy.mock.calls[0]?.[1]

      const mockRequest = mockCreate.mock.results[0]?.value.request

      mockRequest.mockResolvedValueOnce({ data: `success-1` }).mockResolvedValueOnce({ data: `success-2` })

      const error1 = { response: { status: 401 }, config: { _retry: false, url: `/test-1` } }
      const error2 = { response: { status: 401 }, config: { _retry: false, url: `/test-2` } }

      const promise1 = errorHandler(error1)
      const promise2 = errorHandler(error2)

      expect(error2.config._retry).toBe(true)

      const results = await Promise.all([promise1, promise2])

      expect(mockRefreshToken).toHaveBeenCalledTimes(1)
      expect(mockRequest).toHaveBeenCalledTimes(2)

      expect(mockRequest).toHaveBeenCalledWith(expect.objectContaining({
        url: `/test-1`,
        headers: expect.objectContaining({ Authorization: `Bearer new-token` })
      }))
      expect(mockRequest).toHaveBeenCalledWith(expect.objectContaining({
        url: `/test-2`,
        headers: expect.objectContaining({ Authorization: `Bearer new-token` })
      }))

      expect(results[0]).toStrictEqual({ data: `success-1` })
      expect(results[1]).toStrictEqual({ data: `success-2` })
    })
  })

  describe(`creation check`, () => {
    it(`throws error if baseURL is not provided`, () => {
      // @ts-expect-error: Testing runtime check by intentionally passing undefined.
      expect(() => createAuthApiClient(undefined)).toThrow(`Cannot create API client without a baseURL`)
    })
  })
})
