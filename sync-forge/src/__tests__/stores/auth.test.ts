import { ApiEndpoints } from '@/constants/apiEndpoints'
import {
  INTERNAL_REFRESH_TOKEN_KEY,
  INTERNAL_ACCESS_TOKEN_KEY,
  TOKEN_EXPIRES_AT_KEY,
  USER_KEY
} from '@/constants/localStorageKeys'
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores'
import { simpleApiClient } from '@/services/simpleApiClient'
import { authApiClient } from '@/services/authApiClient'

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
    setRefreshTokenFn: vi.fn()
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

  it(`setAuthTokens should store internal tokens and expiry`, () => {
    const store = useAuthStore()
    const expiresIn = 900
    const expiresAt = Date.now() + expiresIn * 1000
    vi.spyOn(Date, `now`).mockReturnValueOnce(expiresAt - expiresIn * 1000)
    
    store.setAuthTokens({
      internalAccessToken: `internal.jwt`,
      internalRefreshToken: `internal.refresh`,
      expiresIn: expiresIn
    })

    expect(localStorage.getItem(INTERNAL_ACCESS_TOKEN_KEY)).toBe(`internal.jwt`)
    expect(localStorage.getItem(INTERNAL_REFRESH_TOKEN_KEY)).toBe(`internal.refresh`)
    expect(localStorage.getItem(TOKEN_EXPIRES_AT_KEY)).toBe(String(expiresAt))
  })

  it(`should login and set user`, () => {
    const store = useAuthStore()
    store.setAuthTokens({
      internalAccessToken: `test-token`,
      expiresIn: 3600
    })
    store.setUser({
      user: { id: `1`, email: `john@example.com`, name: `John` }
    })

    expect(store.user).toStrictEqual({ id: `1`, email: `john@example.com`, name: `John` })
    expect(store.isAuthenticated).toBe(true)
  })

  it(`should logout and clear`, () => {
    const store = useAuthStore()
    store.setAuthTokens({
      internalAccessToken: `test-token`,
      expiresIn: 3600
    })
    store.setUser({
      user: { id: `1`, email: `x`, name: `x` }
    })
    store.logout()

    expect(store.user).toBeNull()
    expect(store.isAuthenticated).toBe(false)
  })

  it(`should clear all auth-related items from localStorage`, () => {
    localStorage.setItem(INTERNAL_ACCESS_TOKEN_KEY, `test-token`)
    localStorage.setItem(INTERNAL_REFRESH_TOKEN_KEY, `test-refresh`)
    localStorage.setItem(TOKEN_EXPIRES_AT_KEY, `12345`)
    localStorage.setItem(USER_KEY, `test-user`)

    const store = useAuthStore()
    store.clearAuthStorage()

    expect(localStorage.getItem(INTERNAL_ACCESS_TOKEN_KEY)).toBeNull()
    expect(localStorage.getItem(INTERNAL_REFRESH_TOKEN_KEY)).toBeNull()
    expect(localStorage.getItem(TOKEN_EXPIRES_AT_KEY)).toBeNull()
    expect(localStorage.getItem(USER_KEY)).toBeNull()
  })

  describe(`initial state`, () => {
    it(`should initialize with a null user if the stored token is expired`, () => {
      const user = { id: `1`, name: `Test User`, email: `test@test.com` }
      localStorage.setItem(USER_KEY, JSON.stringify(user))
      localStorage.setItem(TOKEN_EXPIRES_AT_KEY, String(Date.now() - 1000))

      const store = useAuthStore()

      expect(store.user).toBeNull()
    })

    it(`should initialize with a null user if the stored user data is malformed`, () => {
      localStorage.setItem(USER_KEY, `not-a-valid-json`)
      localStorage.setItem(TOKEN_EXPIRES_AT_KEY, String(Date.now() + 3600 * 1000))

      const store = useAuthStore()

      expect(store.user).toBeNull()
    })
  })

  describe(`getToken`, () => {
    it(`should return null token when not set`, async () => {
      const store = useAuthStore()

      await expect(store.getToken()).resolves.toBeNull()
    })

    it(`should return token when valid`, async () => {
      localStorage.setItem(INTERNAL_ACCESS_TOKEN_KEY, `abc123`)
      localStorage.setItem(TOKEN_EXPIRES_AT_KEY, String(Date.now() + 3600000))
      const store = useAuthStore()

      await expect(store.getToken()).resolves.toBe(`abc123`)
    })

    it(`should return null and logout on expired token`, async () => {
      localStorage.setItem(INTERNAL_ACCESS_TOKEN_KEY, `abc123`)
      localStorage.setItem(TOKEN_EXPIRES_AT_KEY, String(Date.now() - 1000))
      const store = useAuthStore()
      const logoutSpy = vi.spyOn(store, `logout`)

      await expect(store.getToken()).resolves.toBeNull()
      expect(logoutSpy).toHaveBeenCalled()
    })

    it(`should only trigger one refresh for concurrent calls`, async () => {
      localStorage.setItem(INTERNAL_ACCESS_TOKEN_KEY, `old-access`)
      localStorage.setItem(TOKEN_EXPIRES_AT_KEY, String(Date.now() + 30000))
      localStorage.setItem(INTERNAL_REFRESH_TOKEN_KEY, `refresh-me`)

      mockedSimpleApiClientPost.mockResolvedValue({
        data: { internal_access_token: `new-fresh-access`, expires_in: 3600 }
      })

      const store = useAuthStore()
      const promises = [store.getToken(), store.getToken(), store.getToken()]
      const results = await Promise.all(promises)

      expect(results).toStrictEqual([`new-fresh-access`, `new-fresh-access`, `new-fresh-access`])
      expect(simpleApiClient.post).toHaveBeenCalledExactlyOnceWith(ApiEndpoints.AUTH_INTERNAL_REFRESH,
        { internal_refresh_token: `refresh-me` }, expect.anything())
    })
  })

  describe(`isTokenFreshEnough`, () => {
    const BUFFER_MS = 5 * 60 * 1000

    it(`should return true if the token expires after the buffer time`, () => {
      const store = useAuthStore()
      const expiresAt = Date.now() + BUFFER_MS + 1000
      localStorage.setItem(TOKEN_EXPIRES_AT_KEY, String(expiresAt))

      expect(store.isTokenFreshEnough()).toBe(true)
    })

    it(`should return false if the token expires within the buffer time`, () => {
      const store = useAuthStore()
      const expiresAt = Date.now() + BUFFER_MS - 1000
      localStorage.setItem(TOKEN_EXPIRES_AT_KEY, String(expiresAt))

      expect(store.isTokenFreshEnough()).toBe(false)
    })

    it(`should return false if no token expiration is set`, () => {
      const store = useAuthStore()

      expect(store.isTokenFreshEnough()).toBe(false)
    })
  })

  describe(`isTokenValid`, () => {
    it(`should validate token correctly`, () => {
      const store = useAuthStore()

      expect(store.isTokenValid()).toBe(false)

      localStorage.setItem(TOKEN_EXPIRES_AT_KEY, String(Date.now() + 3600000))

      expect(store.isTokenValid()).toBe(true)
    })
  })

  describe(`refreshAccessToken`, () => {
    it(`returns null if no refresh_token`, async () => {
      const store = useAuthStore()

      await expect(store.refreshAccessToken()).resolves.toBeNull()
    })

    it(`refreshes access token and updates storage on success`, async () => {
      localStorage.setItem(INTERNAL_REFRESH_TOKEN_KEY, `old-refresh`)
      mockedSimpleApiClientPost.mockResolvedValue({
        data: { internal_access_token: `new-access`, expires_in: 3600 }
      })

      const store = useAuthStore()
      const result = await store.refreshAccessToken()

      expect(result).toBe(`new-access`)
      expect(localStorage.getItem(INTERNAL_ACCESS_TOKEN_KEY)).toBe(`new-access`)

      const expiresAt = Number(localStorage.getItem(TOKEN_EXPIRES_AT_KEY))

      expect(expiresAt).toBeGreaterThan(Date.now() + 3500000)
    })

    it(`updates refresh token if rotated token is returned`, async () => {
      localStorage.setItem(INTERNAL_REFRESH_TOKEN_KEY, `old-refresh`)
      mockedSimpleApiClientPost.mockResolvedValue({
        data: {
          internal_access_token: `new-access`,
          internal_refresh_token: `new-rotated-refresh`,
          expires_in: 3600
        }
      })

      const store = useAuthStore()
      await store.refreshAccessToken()

      expect(localStorage.getItem(INTERNAL_REFRESH_TOKEN_KEY)).toBe(`new-rotated-refresh`)
    })

    it(`returns null on API error`, async () => {
      localStorage.setItem(INTERNAL_REFRESH_TOKEN_KEY, `bad-refresh`)
      mockedSimpleApiClientPost.mockRejectedValue(new Error(`network error`))

      const store = useAuthStore()
      const result = await store.refreshAccessToken()

      expect(result).toBeNull()
    })

    it(`returns null if no access_token in response`, async () => {
      localStorage.setItem(INTERNAL_REFRESH_TOKEN_KEY, `old-refresh`)
      mockedSimpleApiClientPost.mockResolvedValue({ data: { expires_in: 3600 } })

      const store = useAuthStore()
      const result = await store.refreshAccessToken()

      expect(result).toBeNull()
    })

    it(`restores user from localStorage on successful refresh if state is null`, async () => {
      const user = { id: `1`, name: `Test User`, email: `test@test.com` }
      localStorage.setItem(USER_KEY, JSON.stringify(user))
      localStorage.setItem(INTERNAL_REFRESH_TOKEN_KEY, `old-refresh`)
      mockedSimpleApiClientPost.mockResolvedValue({
        data: { internal_access_token: `new-access`, expires_in: 3600 }
      })

      const store = useAuthStore()

      expect(store.user).toBeNull()

      await store.refreshAccessToken()

      expect(store.user).toStrictEqual(user)
      expect(store.isAuthenticated).toBe(true)
    })
  })

  it(`auto-refreshes near-expiry token`, async () => {
    localStorage.setItem(INTERNAL_ACCESS_TOKEN_KEY, `old-access`)
    localStorage.setItem(TOKEN_EXPIRES_AT_KEY, String(Date.now() + 30000))
    localStorage.setItem(INTERNAL_REFRESH_TOKEN_KEY, `refresh-me`)

    mockedSimpleApiClientPost.mockResolvedValue({
      data: { internal_access_token: `fresh-access`, expires_in: 3600 }
    })

    const store = useAuthStore()
    const token = await store.getToken()

    expect(token).toBe(`fresh-access`)
  })

  describe(`init`, () => {
    it(`should schedule a proactive refresh if a valid token exists`, () => {
      const user = { id: `1`, name: `Test User`, email: `test@test.com` }
      localStorage.setItem(USER_KEY, JSON.stringify(user))
      localStorage.setItem(TOKEN_EXPIRES_AT_KEY, String(Date.now() + 3600 * 1000))

      const store = useAuthStore()
      const scheduleRefreshSpy = vi.spyOn(store, `scheduleProactiveRefresh`)
      store.init()

      expect(authApiClient.setRefreshTokenFn).toHaveBeenCalled()
      expect(scheduleRefreshSpy).toHaveBeenCalled()
    })

    it(`should not schedule a refresh if no token exists`, () => {
      const store = useAuthStore()
      const scheduleRefreshSpy = vi.spyOn(store, `scheduleProactiveRefresh`)
      store.init()

      expect(authApiClient.setRefreshTokenFn).toHaveBeenCalled()
      expect(scheduleRefreshSpy).not.toHaveBeenCalled()
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

      // Set a token that expires in 1 hour (3600 seconds)
      store.setAuthTokens({
        internalAccessToken: `test-token`,
        expiresIn: 3600
      })

      expect(refreshSpy).not.toHaveBeenCalled()

      // Advance time by 54 minutes - nothing should happen yet
      vi.advanceTimersByTime(54 * 60 * 1000)

      expect(refreshSpy).not.toHaveBeenCalled()

      // Advance time by 1 more minute (55 total) - it should have been called
      vi.advanceTimersByTime(1 * 60 * 1000)

      expect(refreshSpy).toHaveBeenCalled()
    })

    it(`cancels the proactive refresh on logout`, () => {
      const store = useAuthStore()
      const refreshSpy = vi.spyOn(store, `refreshAccessToken`)

      store.setAuthTokens({
        internalAccessToken: `test-token`,
        expiresIn: 3600
      })

      store.logout()

      // Advance time past the 55-minute mark
      vi.advanceTimersByTime(56 * 60 * 1000)

      expect(refreshSpy).not.toHaveBeenCalled()
    })
  })
})
