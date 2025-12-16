import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest'
import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type AxiosError,
  type AxiosRequestHeaders
} from 'axios'
import { type CollabApiClient, createApiClient, CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from '@/http/apiClient'
import type { Router } from 'vue-router'

vi.mock(`axios`, () => ({
  default: {
    create: vi.fn(() => ({
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
      }
    }))
  }
}))

const MOCK_URL = `http://test.api`

describe(`createApiClient`, () => {
  const mockedAxios = vi.mocked(axios, true)
  let requestInterceptor: (config: AxiosRequestConfig) => AxiosRequestConfig
  let responseInterceptorSuccess: (response: AxiosResponse) => AxiosResponse
  let responseInterceptorError: (error: AxiosError) => Promise<never>
  let locationHrefSpy: Mock

  // Helper function to create a mock Axios instance
  const createMockAxiosInstance = (): AxiosInstance => {
    const instance = {
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
      }
    } as unknown as AxiosInstance
    return instance
  }

  beforeEach(() => {
    // Clear mocks before each test
    mockedAxios.create.mockClear()

    // Reset mock implementation
    mockedAxios.create.mockImplementation(() => createMockAxiosInstance())

    // Mock window.location
    locationHrefSpy = vi.fn()
    Object.defineProperty(window, `location`, {
      value: {
        set href(v: string) {
          locationHrefSpy(v)
        }
      },
      configurable: true
    })

    // Mock document.cookie
    Object.defineProperty(document, `cookie`, {
      writable: true,
      value: ``
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    document.cookie = `${CSRF_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
  })

  it(`throws an error if baseURL is not provided`, () => {
    // @ts-expect-error: Testing runtime validation with undefined
    expect(() => createApiClient(undefined)).toThrow(`Cannot create API client without a baseURL`)

    expect(() => createApiClient(``)).toThrow(`Cannot create API client without a baseURL`)
  })

  it(`creates an axios instance with the correct baseURL and credentials`, () => {
    createApiClient(MOCK_URL)

    expect(mockedAxios.create).toHaveBeenCalledWith({
      baseURL: MOCK_URL,
      withCredentials: true
    })
  })

  describe(`CSRF Request Interceptor`, () => {
    beforeEach(() => {
      createApiClient(MOCK_URL)
      const createdInstance = mockedAxios.create.mock.results[0]?.value
      if (!createdInstance) {
        throw new Error(`axios.create was not called`)
      }

      const reqInterceptorUse = vi.mocked(createdInstance.interceptors.request.use)
      requestInterceptor = reqInterceptorUse.mock.calls[0]?.[0] as (config: AxiosRequestConfig) => AxiosRequestConfig
    })

    it(`should add X-CSRF-Token header to POST requests when cookie is present`, () => {
      const csrfToken = `test-csrf-token`
      document.cookie = `${CSRF_COOKIE_NAME}=${csrfToken}`

      const config: AxiosRequestConfig = {
        method: `POST`,
        headers: {}
      }
      const newConfig = requestInterceptor(config)

      expect(newConfig.headers?.[CSRF_HEADER_NAME]).toBe(csrfToken)
    })

    it(`should not add X-CSRF-Token header for GET requests`, () => {
      const csrfToken = `test-csrf-token`
      document.cookie = `${CSRF_COOKIE_NAME}=${csrfToken}`

      const config: AxiosRequestConfig = {
        method: `GET`,
        headers: {}
      }
      const newConfig = requestInterceptor(config)

      expect(newConfig.headers?.[CSRF_HEADER_NAME]).toBeUndefined()
    })

    it(`should add X-CSRF-Token header to PUT requests when cookie is present`, () => {
      const csrfToken = `test-csrf-token`
      document.cookie = `${CSRF_COOKIE_NAME}=${csrfToken}`

      const config: AxiosRequestConfig = {
        method: `PUT`,
        headers: {}
      }
      const newConfig = requestInterceptor(config)

      expect(newConfig.headers?.[CSRF_HEADER_NAME]).toBe(csrfToken)
    })

    it(`should add X-CSRF-Token header to PATCH requests when cookie is present`, () => {
      const csrfToken = `test-csrf-token`
      document.cookie = `${CSRF_COOKIE_NAME}=${csrfToken}`

      const config: AxiosRequestConfig = {
        method: `PATCH`,
        headers: {}
      }
      const newConfig = requestInterceptor(config)

      expect(newConfig.headers?.[CSRF_HEADER_NAME]).toBe(csrfToken)
    })

    it(`should add X-CSRF-Token header to DELETE requests when cookie is present`, () => {
      const csrfToken = `test-csrf-token`
      document.cookie = `${CSRF_COOKIE_NAME}=${csrfToken}`

      const config: AxiosRequestConfig = {
        method: `DELETE`,
        headers: {}
      }
      const newConfig = requestInterceptor(config)

      expect(newConfig.headers?.[CSRF_HEADER_NAME]).toBe(csrfToken)
    })

    it(`should not add X-CSRF-Token header when no CSRF cookie is present`, () => {
      // Clear any existing cookie
      document.cookie = `${CSRF_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`

      const config: AxiosRequestConfig = {
        method: `POST`,
        headers: {}
      }
      const newConfig = requestInterceptor(config)

      expect(newConfig.headers?.[CSRF_HEADER_NAME]).toBeUndefined()
    })

    it(`should preserve existing headers`, () => {
      const csrfToken = `test-csrf-token`
      document.cookie = `${CSRF_COOKIE_NAME}=${csrfToken}`

      const config: AxiosRequestConfig = {
        method: `POST`,
        headers: {
          'Content-Type': `application/json`,
          Authorization: `Bearer token123`
        }
      }
      const newConfig = requestInterceptor(config)

      expect(newConfig.headers?.[`Content-Type`]).toBe(`application/json`)
      expect(newConfig.headers?.Authorization).toBe(`Bearer token123`)
      expect(newConfig.headers?.[CSRF_HEADER_NAME]).toBe(csrfToken)
    })

    it(`should handle undefined method gracefully`, () => {
      const csrfToken = `test-csrf-token`
      document.cookie = `${CSRF_COOKIE_NAME}=${csrfToken}`

      const config: AxiosRequestConfig = {
        method: undefined,
        headers: {}
      }
      const newConfig = requestInterceptor(config)

      expect(newConfig.headers?.[CSRF_HEADER_NAME]).toBeUndefined()
    })

    it(`should handle case-insensitive method comparison`, () => {
      const csrfToken = `test-csrf-token`
      document.cookie = `${CSRF_COOKIE_NAME}=${csrfToken}`

      const config: AxiosRequestConfig = {
        method: `post`, // lowercase
        headers: {}
      }
      const newConfig = requestInterceptor(config)

      expect(newConfig.headers?.[CSRF_HEADER_NAME]).toBe(csrfToken)
    })
  })

  describe(`401 Response Interceptor`, () => {
    let mockError: AxiosError

    beforeEach(() => {
      createApiClient(MOCK_URL)
      const createdInstance = mockedAxios.create.mock.results[0]?.value
      if (!createdInstance) {
        throw new Error(`axios.create was not called`)
      }

      const respInterceptorUse = vi.mocked(createdInstance.interceptors.response.use)
      responseInterceptorSuccess = respInterceptorUse.mock.calls[0]?.[0] as (response: AxiosResponse) => AxiosResponse
      responseInterceptorError = respInterceptorUse.mock.calls[0]?.[1] as (error: AxiosError) => Promise<never>
    })

    it(`should redirect to /login on a 401 error`, async () => {
      mockError = {
        response: {
          status: 401,
          statusText: `Unauthorized`,
          data: {},
          headers: {},
          config: {}
        },
        config: {
          url: `/protected`,
          headers: {} as Record<string, string>
        },
        isAxiosError: true,
        toJSON: () => ({}),
        name: ``,
        message: ``
      } as AxiosError

      await expect(responseInterceptorError(mockError)).rejects.toStrictEqual(mockError)
      expect(locationHrefSpy).toHaveBeenCalledWith(`/login`)
    })

    it(`should not redirect on 401 if the endpoint is /api/auth/me`, async () => {
      mockError = {
        response: {
          status: 401,
          statusText: `Unauthorized`,
          data: {},
          headers: {},
          config: {}
        },
        config: {
          url: `/api/auth/me`,
          headers: {} as Record<string, string>
        },
        isAxiosError: true,
        toJSON: () => ({}),
        name: ``,
        message: ``
      } as AxiosError

      await expect(responseInterceptorError(mockError)).rejects.toStrictEqual(mockError)
      expect(locationHrefSpy).not.toHaveBeenCalled()
    })

    it(`should not redirect on 401 if the endpoint contains /api/auth/me in the path`, async () => {
      mockError = {
        response: {
          status: 401,
          statusText: `Unauthorized`,
          data: {},
          headers: {},
          config: {}
        },
        config: {
          url: `https://api.example.com/api/auth/me`,
          headers: {} as Record<string, string>
        },
        isAxiosError: true,
        toJSON: () => ({}),
        name: ``,
        message: ``
      } as AxiosError

      await expect(responseInterceptorError(mockError)).rejects.toStrictEqual(mockError)
      expect(locationHrefSpy).not.toHaveBeenCalled()
    })

    it(`should re-throw non-401 errors without redirecting`, async () => {
      mockError = {
        response: {
          status: 500,
          statusText: `Internal Server Error`,
          data: {},
          headers: {},
          config: {}
        },
        config: {
          url: `/error`,
          headers: {} as Record<string, string>
        },
        isAxiosError: true,
        toJSON: () => ({}),
        name: ``,
        message: ``
      } as AxiosError

      await expect(responseInterceptorError(mockError)).rejects.toStrictEqual(mockError)
      expect(locationHrefSpy).not.toHaveBeenCalled()
    })

    it(`should re-throw errors without response object`, async () => {
      mockError = {
        config: {
          url: `/timeout`,
          headers: {} as Record<string, string>
        },
        isAxiosError: true,
        toJSON: () => ({}),
        name: `Network Error`,
        message: `Network Error`
      } as AxiosError

      await expect(responseInterceptorError(mockError)).rejects.toStrictEqual(mockError)
      expect(locationHrefSpy).not.toHaveBeenCalled()
    })

    it(`should re-throw errors with undefined config`, async () => {
      mockError = {
        response: {
          status: 401,
          statusText: `Unauthorized`,
          data: {},
          headers: {},
          config: {}
        },
        config: undefined,
        isAxiosError: true,
        toJSON: () => ({}),
        name: ``,
        message: ``
      } as AxiosError

      await expect(responseInterceptorError(mockError)).rejects.toStrictEqual(mockError)
      // Should still redirect since config is undefined (can't check for /api/auth/me)
      expect(locationHrefSpy).toHaveBeenCalledWith(`/login`)
    })

    it(`should re-throw errors with undefined url in config`, async () => {
      mockError = {
        response: {
          status: 401,
          statusText: `Unauthorized`,
          data: {},
          headers: {},
          config: {}
        },
        config: {
          url: undefined,
          headers: {} as Record<string, string>
        },
        isAxiosError: true,
        toJSON: () => ({}),
        name: ``,
        message: ``
      } as AxiosError

      await expect(responseInterceptorError(mockError)).rejects.toStrictEqual(mockError)
      // Should still redirect since url is undefined (can't check for /api/auth/me)
      expect(locationHrefSpy).toHaveBeenCalledWith(`/login`)
    })

    it(`should pass through successful responses`, () => {
      const mockResponse: AxiosResponse = {
        data: { success: true },
        status: 200,
        statusText: `OK`,
        headers: {},
        config: { headers: {} as AxiosRequestHeaders }
      }

      expect(responseInterceptorSuccess(mockResponse)).toStrictEqual(mockResponse)
    })
  })

  describe(`getCsrfToken helper function`, () => {
    // We need to test the actual implementation by importing the original module
    // Since getCsrfToken is not exported, we'll test it indirectly through createApiClient

    it(`should extract CSRF token from document.cookie`, () => {
      // We'll test this by creating a client and checking the interceptor behavior
      const csrfToken = `test-csrf-token-value`
      document.cookie = `${CSRF_COOKIE_NAME}=${csrfToken}`

      createApiClient(MOCK_URL)
      const createdInstance = mockedAxios.create.mock.results[0]?.value
      const reqInterceptorUse = vi.mocked(createdInstance.interceptors.request.use)
      requestInterceptor = reqInterceptorUse.mock.calls[0]?.[0] as (config: AxiosRequestConfig) => AxiosRequestConfig

      const config: AxiosRequestConfig = {
        method: `POST`,
        headers: {}
      }
      const newConfig = requestInterceptor(config)

      expect(newConfig.headers?.[CSRF_HEADER_NAME]).toBe(csrfToken)
    })

    it(`should handle multiple cookies`, () => {
      const csrfToken = `test-csrf-token-value`
      document.cookie = `sessionId=abc123; ${CSRF_COOKIE_NAME}=${csrfToken}; otherCookie=value`

      createApiClient(MOCK_URL)
      const createdInstance = mockedAxios.create.mock.results[0]?.value
      const reqInterceptorUse = vi.mocked(createdInstance.interceptors.request.use)
      requestInterceptor = reqInterceptorUse.mock.calls[0]?.[0] as (config: AxiosRequestConfig) => AxiosRequestConfig

      const config: AxiosRequestConfig = {
        method: `POST`,
        headers: {}
      }
      const newConfig = requestInterceptor(config)

      expect(newConfig.headers?.[CSRF_HEADER_NAME]).toBe(csrfToken)
    })

    it(`should return undefined when cookie is not present`, () => {
      document.cookie = `otherCookie=value`

      createApiClient(MOCK_URL)
      const createdInstance = mockedAxios.create.mock.results[0]?.value
      const reqInterceptorUse = vi.mocked(createdInstance.interceptors.request.use)
      requestInterceptor = reqInterceptorUse.mock.calls[0]?.[0] as (config: AxiosRequestConfig) => AxiosRequestConfig

      const config: AxiosRequestConfig = {
        method: `POST`,
        headers: {}
      }
      const newConfig = requestInterceptor(config)

      expect(newConfig.headers?.[CSRF_HEADER_NAME]).toBeUndefined()
    })
  })

  describe(`401 Response Interceptor (with Router)`, () => {
    let apiClient: CollabApiClient
    let mockRouter: Router

    beforeEach(() => {
      // Create a fresh client for each test in this describe block
      apiClient = createApiClient(MOCK_URL)

      // Mock Vue Router
      mockRouter = {
        push: vi.fn().mockResolvedValue(undefined)
      } as unknown as Router

      // Inject the router
      apiClient.injectRouter(mockRouter)

      // Extract the response error interceptor from the underlying axios instance
      const axiosInstance = apiClient as unknown as AxiosInstance
      const respInterceptorUse = vi.mocked(axiosInstance.interceptors.response.use)
      responseInterceptorError = respInterceptorUse.mock.calls[0]?.[1] as (error: AxiosError) => Promise<never>
    })

    it(`should use router.push on 401 error`, async () => {
      const mockError: AxiosError = {
        response: {
          status: 401,
          statusText: `Unauthorized`,
          data: {},
          headers: {},
          config: {}
        },
        config: {
          url: `/some-protected-endpoint`,
          headers: {} as Record<string, string>
        },
        isAxiosError: true,
        toJSON: () => ({}),
        name: ``,
        message: ``
      } as AxiosError

      await expect(responseInterceptorError(mockError)).rejects.toStrictEqual(mockError)

      expect(mockRouter.push).toHaveBeenCalledExactlyOnceWith(`/login`)
      expect(locationHrefSpy).not.toHaveBeenCalled()
    })

    it(`should still redirect using window.location if router is not injected`, async () => {
      // Create a client without injecting router
      const clientWithoutRouter = createApiClient(MOCK_URL)
      const axiosInstance = clientWithoutRouter as unknown as AxiosInstance
      const respInterceptorUse = vi.mocked(axiosInstance.interceptors.response.use)
      const errorHandler = respInterceptorUse.mock.calls[0]?.[1] as (error: AxiosError) => Promise<never>

      const mockError: AxiosError = {
        response: {
          status: 401,
          statusText: `Unauthorized`,
          data: {},
          headers: {},
          config: {}
        },
        config: {
          url: `/some-protected-endpoint`,
          headers: {} as Record<string, string>
        },
        isAxiosError: true,
        toJSON: () => ({}),
        name: ``,
        message: ``
      } as AxiosError

      await expect(errorHandler(mockError)).rejects.toStrictEqual(mockError)

      expect(locationHrefSpy).toHaveBeenCalledWith(`/login`)
      // router.push should not be called because router was never injected
    })

    it(`should not redirect when endpoint is /api/auth/me even with router injected`, async () => {
      const mockError: AxiosError = {
        response: {
          status: 401,
          statusText: `Unauthorized`,
          data: {},
          headers: {},
          config: {}
        },
        config: {
          url: `/api/auth/me`,
          headers: {} as Record<string, string>
        },
        isAxiosError: true,
        toJSON: () => ({}),
        name: ``,
        message: ``
      } as AxiosError

      await expect(responseInterceptorError(mockError)).rejects.toStrictEqual(mockError)

      expect(mockRouter.push).not.toHaveBeenCalled()
      expect(locationHrefSpy).not.toHaveBeenCalled()
    })
  })
})
