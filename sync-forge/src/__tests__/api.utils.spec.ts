import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createApiClient } from '@/utils/api'
import axios from 'axios'

vi.mock('axios', () => ({
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

describe('createApiClient', () => {
  const mockCreate = vi.mocked(axios.create)

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('creates instance with correct timeout', () => {
    createApiClient()
    expect(mockCreate).toHaveBeenCalledWith({
      timeout: 10000
    })
  })

  describe('request interceptor', () => {
    it('adds Authorization header when token exists', () => {
      localStorage.setItem('access_token', 'fake-token')
      createApiClient()

      const useSpy = mockCreate.mock.results[0]?.value.interceptors.request.use
      const handler = useSpy.mock.calls[0]?.[0]
      const config = { headers: {} }
      const result = handler(config)

      expect(result.headers.Authorization).toBe('Bearer fake-token')
    })

    it('does not add Authorization header when no token exists', () => {
      createApiClient()

      const useSpy = mockCreate.mock.results[0]?.value.interceptors.request.use
      const handler = useSpy.mock.calls[0]?.[0]
      const config = { headers: {} }
      const result = handler(config)

      expect(result.headers.Authorization).toBeUndefined()
    })

    it('preserves existing headers', () => {
      localStorage.setItem('access_token', 'fake-token')
      createApiClient()

      const useSpy = mockCreate.mock.results[0]?.value.interceptors.request.use
      const handler = useSpy.mock.calls[0]?.[0]
      const config = { headers: { 'Content-Type': 'application/json' } }
      const result = handler(config)

      expect(result.headers['Content-Type']).toBe('application/json')
      expect(result.headers.Authorization).toBe('Bearer fake-token')
    })
  })

  it('registers request interceptor', () => {
    createApiClient()

    const instance = mockCreate.mock.results[0]?.value
    expect(instance.interceptors.request.use).toHaveBeenCalledTimes(1)
    expect(instance.interceptors.request.use).toHaveBeenCalledWith(
      expect.any(Function)
    )
  })

  describe('response interceptor (401 retry)', () => {
    it('retries request with fresh token on 401', async () => {
      const mockRefreshToken = vi.fn().mockResolvedValue('new-token')
      createApiClient(mockRefreshToken)

      const instance = mockCreate.mock.results[0]?.value
      const responseUseSpy = instance.interceptors.response.use
      const errorHandler = responseUseSpy.mock.calls[0]?.[1]

      const error = {
        response: { status: 401 },
        config: { headers: { Authorization: 'Bearer old-token' } }
      }

      instance.request.mockResolvedValue({ data: 'success' })

      const result = await errorHandler(error)

      expect(mockRefreshToken).toHaveBeenCalledTimes(1)
      expect(error.config.headers.Authorization).toBe('Bearer new-token')
      expect(instance.request).toHaveBeenCalledWith(error.config)
      expect(result).toEqual({ data: 'success' })
    })

    it('rejects if refresh returns null', async () => {
      const mockRefreshToken = vi.fn().mockResolvedValue(null)
      createApiClient(mockRefreshToken)

      const instance = mockCreate.mock.results[0]?.value
      const responseUseSpy = instance.interceptors.response.use
      const errorHandler = responseUseSpy.mock.calls[0]?.[1]

      const error = {
        response: { status: 401 },
        config: { headers: {} }
      }

      await expect(errorHandler(error)).rejects.toEqual(error)
      expect(mockRefreshToken).toHaveBeenCalledTimes(1)
      expect(instance.request).not.toHaveBeenCalled()
    })

    it('rejects if no refreshToken function provided', async () => {
      createApiClient() // No refresh function

      const instance = mockCreate.mock.results[0]?.value
      const responseUseSpy = instance.interceptors.response.use
      const errorHandler = responseUseSpy.mock.calls[0]?.[1]

      const error = {
        response: { status: 401 },
        config: { headers: {} }
      }

      await expect(errorHandler(error)).rejects.toEqual(error)
    })

    it('passes through non-401 errors', async () => {
      const mockRefreshToken = vi.fn()
      createApiClient(mockRefreshToken)

      const instance = mockCreate.mock.results[0]?.value
      const responseUseSpy = instance.interceptors.response.use
      const errorHandler = responseUseSpy.mock.calls[0]?.[1]

      const error = {
        response: { status: 500 },
        config: { headers: {} }
      }

      await expect(errorHandler(error)).rejects.toEqual(error)
      expect(mockRefreshToken).not.toHaveBeenCalled()
    })

    it('registers response interceptor', () => {
      createApiClient()

      const instance = mockCreate.mock.results[0]?.value
      expect(instance.interceptors.response.use).toHaveBeenCalledTimes(1)
      expect(instance.interceptors.response.use).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function)
      )
    })
  })
})