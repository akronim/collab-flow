import { ApiEndpoints } from '@/constants/apiEndpoints'
import { CODE_VERIFIER_KEY } from '@/constants/localStorageKeys'
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores'
import { simpleApiClient } from '@/services/simpleApiClient'
import { authApiClient } from '@/services/authApiClient'

// Valid JWT for testing (payload: { id: '1', name: 'Test User', email: 'test@test.com' })
// eslint-disable-next-line @stylistic/max-len
const VALID_JWT = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEiLCJuYW1lIjoiVGVzdCBVc2VyIiwiZW1haWwiOiJ0ZXN0QHRlc3QuY29tIn0.signature`

vi.mock(`@/services/simpleApiClient`, () => ({
  simpleApiClient: {
    post: vi.fn(),
    get: vi.fn()
  }
}))

vi.mock(`@/services/authApiClient`, () => ({
  authApiClient: {
    post: vi.fn(),
    get: vi.fn(),
    setRefreshTokenFn: vi.fn(),
    setGetTokenFn: vi.fn()
  }
}))

vi.mock(`axios`, () => ({
  default: {
    create: vi.fn().mockReturnValue({
      post: vi.fn(),
      get: vi.fn()
    }),
    post: vi.fn()
  }
}))

const mockedSimpleApiClientPost = vi.mocked(simpleApiClient.post)

describe(`useAuthStore`, () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe(`setAuthData`, () => {
    it(`should store access token in memory and decode user from JWT`, () => {
      const store = useAuthStore()

      store.setAuthData(VALID_JWT, 900)

      expect(store.accessToken).toBe(VALID_JWT)
      expect(store.user).toStrictEqual({ id: `1`, name: `Test User`, email: `test@test.com` })
      expect(store.isAuthenticated).toBe(true)
      expect(store.expiresAt).toBeGreaterThan(Date.now())
    })

    it(`should schedule proactive refresh`, () => {
      const store = useAuthStore()
      const scheduleSpy = vi.spyOn(store, `scheduleProactiveRefresh`)

      store.setAuthData(VALID_JWT, 900)

      expect(scheduleSpy).toHaveBeenCalledWith(900)
    })
  })

  describe(`logout`, () => {
    it(`should clear state and call backend`, async () => {
      const store = useAuthStore()
      store.setAuthData(VALID_JWT, 3600)

      mockedSimpleApiClientPost.mockResolvedValue({})

      await store.logout()

      expect(store.user).toBeNull()
      expect(store.accessToken).toBeNull()
      expect(store.expiresAt).toBeNull()
      expect(store.isAuthenticated).toBe(false)
      expect(simpleApiClient.post).toHaveBeenCalledWith(ApiEndpoints.AUTH_LOGOUT)
    })

    it(`should clear state even if backend call fails`, async () => {
      const store = useAuthStore()
      store.setAuthData(VALID_JWT, 3600)

      mockedSimpleApiClientPost.mockRejectedValue(new Error(`network error`))

      await store.logout()

      expect(store.user).toBeNull()
      expect(store.accessToken).toBeNull()
      expect(store.isAuthenticated).toBe(false)
    })

    it(`should cancel proactive refresh timer`, async () => {
      const store = useAuthStore()
      store.setAuthData(VALID_JWT, 3600)
      const cancelSpy = vi.spyOn(store, `cancelProactiveRefresh`)

      mockedSimpleApiClientPost.mockResolvedValue({})

      await store.logout()

      expect(cancelSpy).toHaveBeenCalled()
    })
  })

  describe(`clearAuthStorage`, () => {
    it(`should only clear CODE_VERIFIER_KEY from localStorage`, () => {
      localStorage.setItem(CODE_VERIFIER_KEY, `test-verifier`)
      localStorage.setItem(`other-key`, `other-value`)

      const store = useAuthStore()
      store.clearAuthStorage()

      expect(localStorage.getItem(CODE_VERIFIER_KEY)).toBeNull()
      expect(localStorage.getItem(`other-key`)).toBe(`other-value`)
    })
  })

  describe(`initial state`, () => {
    it(`should initialize with null user and tokens`, () => {
      const store = useAuthStore()

      expect(store.user).toBeNull()
      expect(store.accessToken).toBeNull()
      expect(store.expiresAt).toBeNull()
      expect(store.isAuthenticated).toBe(false)
    })
  })

  describe(`getToken`, () => {
    it(`should return null and attempt refresh when no token`, async () => {
      mockedSimpleApiClientPost.mockRejectedValue(new Error(`no cookie`))

      const store = useAuthStore()
      const result = await store.getToken()

      expect(result).toBeNull()
      expect(simpleApiClient.post).toHaveBeenCalledWith(ApiEndpoints.AUTH_INTERNAL_REFRESH, {})
    })

    it(`should return token when valid and not expired`, async () => {
      const store = useAuthStore()
      store.setAuthData(VALID_JWT, 3600)

      const result = await store.getToken()

      expect(result).toBe(VALID_JWT)
      expect(simpleApiClient.post).not.toHaveBeenCalled()
    })

    it(`should refresh when token is near expiry`, async () => {
      const store = useAuthStore()
      store.accessToken = `old-token`
      store.expiresAt = Date.now() + 30000 // 30 seconds - within 60s buffer

      const newJwt = VALID_JWT
      mockedSimpleApiClientPost.mockResolvedValue({
        data: { internal_access_token: newJwt, expires_in: 3600 }
      })

      const result = await store.getToken()

      expect(result).toBe(newJwt)
      expect(simpleApiClient.post).toHaveBeenCalledWith(ApiEndpoints.AUTH_INTERNAL_REFRESH, {})
    })

    it(`should only trigger one refresh for concurrent calls`, async () => {
      mockedSimpleApiClientPost.mockResolvedValue({
        data: { internal_access_token: VALID_JWT, expires_in: 3600 }
      })

      const store = useAuthStore()
      const promises = [store.getToken(), store.getToken(), store.getToken()]
      const results = await Promise.all(promises)

      expect(results).toStrictEqual([VALID_JWT, VALID_JWT, VALID_JWT])
      expect(simpleApiClient.post).toHaveBeenCalledTimes(1)
    })
  })

  describe(`isTokenFreshEnough`, () => {
    const BUFFER_MS = 5 * 60 * 1000

    it(`should return true if the token expires after the buffer time`, () => {
      const store = useAuthStore()
      store.expiresAt = Date.now() + BUFFER_MS + 1000

      expect(store.isTokenFreshEnough()).toBe(true)
    })

    it(`should return false if the token expires within the buffer time`, () => {
      const store = useAuthStore()
      store.expiresAt = Date.now() + BUFFER_MS - 1000

      expect(store.isTokenFreshEnough()).toBe(false)
    })

    it(`should return false if no token expiration is set`, () => {
      const store = useAuthStore()

      expect(store.isTokenFreshEnough()).toBe(false)
    })
  })

  describe(`isTokenValid`, () => {
    it(`should return false when no expiry set`, () => {
      const store = useAuthStore()

      expect(store.isTokenValid()).toBe(false)
    })

    it(`should return true when token not expired`, () => {
      const store = useAuthStore()
      store.expiresAt = Date.now() + 3600000

      expect(store.isTokenValid()).toBe(true)
    })

    it(`should return false when token near expiry`, () => {
      const store = useAuthStore()
      store.expiresAt = Date.now() + 30000 // within 60s buffer

      expect(store.isTokenValid()).toBe(false)
    })
  })

  describe(`refreshAccessToken`, () => {
    it(`sends empty body and relies on cookie`, async () => {
      mockedSimpleApiClientPost.mockResolvedValue({
        data: { internal_access_token: VALID_JWT, expires_in: 3600 }
      })

      const store = useAuthStore()
      await store.refreshAccessToken()

      expect(simpleApiClient.post).toHaveBeenCalledWith(ApiEndpoints.AUTH_INTERNAL_REFRESH, {})
    })

    it(`refreshes access token and sets auth data on success`, async () => {
      mockedSimpleApiClientPost.mockResolvedValue({
        data: { internal_access_token: VALID_JWT, expires_in: 3600 }
      })

      const store = useAuthStore()
      const result = await store.refreshAccessToken()

      expect(result).toBe(VALID_JWT)
      expect(store.accessToken).toBe(VALID_JWT)
      expect(store.user).toStrictEqual({ id: `1`, name: `Test User`, email: `test@test.com` })
    })

    it(`returns null on API error`, async () => {
      mockedSimpleApiClientPost.mockRejectedValue(new Error(`network error`))

      const store = useAuthStore()
      const result = await store.refreshAccessToken()

      expect(result).toBeNull()
    })

    it(`returns null if no access_token in response`, async () => {
      mockedSimpleApiClientPost.mockResolvedValue({ data: { expires_in: 3600 } })

      const store = useAuthStore()
      const result = await store.refreshAccessToken()

      expect(result).toBeNull()
    })

    it(`does not call logout on failure`, async () => {
      mockedSimpleApiClientPost.mockRejectedValue(new Error(`network error`))

      const store = useAuthStore()
      const logoutSpy = vi.spyOn(store, `logout`)

      await store.refreshAccessToken()

      expect(logoutSpy).not.toHaveBeenCalled()
    })
  })

  describe(`init`, () => {
    it(`should set up authApiClient functions`, () => {
      const store = useAuthStore()
      store.init()

      expect(authApiClient.setRefreshTokenFn).toHaveBeenCalled()
      expect(authApiClient.setGetTokenFn).toHaveBeenCalled()
    })
  })

  describe(`proactive refresh`, () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it(`schedules a proactive refresh 5 minutes before the token expires`, () => {
      const store = useAuthStore()
      const refreshSpy = vi.spyOn(store, `refreshAccessToken`)

      store.setAuthData(VALID_JWT, 3600)

      expect(refreshSpy).not.toHaveBeenCalled()

      // Advance time by 54 minutes - nothing should happen yet
      vi.advanceTimersByTime(54 * 60 * 1000)

      expect(refreshSpy).not.toHaveBeenCalled()

      // Advance time by 1 more minute (55 total) - it should have been called
      vi.advanceTimersByTime(1 * 60 * 1000)

      expect(refreshSpy).toHaveBeenCalled()
    })

    it(`cancels the proactive refresh on logout`, async () => {
      mockedSimpleApiClientPost.mockResolvedValue({})

      const store = useAuthStore()
      const refreshSpy = vi.spyOn(store, `refreshAccessToken`)

      store.setAuthData(VALID_JWT, 3600)

      await store.logout()

      // Advance time past the 55-minute mark
      vi.advanceTimersByTime(56 * 60 * 1000)

      // refreshAccessToken should not have been called by timer
      expect(refreshSpy).not.toHaveBeenCalled()
    })
  })

  describe(`PKCE`, () => {
    it(`should set and get code verifier`, () => {
      const store = useAuthStore()

      store.setPkceCodeVerifier(`test-verifier`)

      expect(localStorage.getItem(CODE_VERIFIER_KEY)).toBe(`test-verifier`)
      expect(store.getPkceCodeVerifier()).toBe(`test-verifier`)
    })

    it(`should clear code verifier`, () => {
      const store = useAuthStore()
      store.setPkceCodeVerifier(`test-verifier`)

      store.clearPkceCodeVerifier()

      expect(localStorage.getItem(CODE_VERIFIER_KEY)).toBeNull()
    })
  })
})
