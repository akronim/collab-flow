import { googleOAuthConfig } from '@/constants'
import {
  ACCESS_TOKEN_KEY,
  IS_GOOGLE_LOGIN_KEY,
  REFRESH_TOKEN_KEY,
  TOKEN_EXPIRES_AT_KEY,
  USER_KEY
} from '@/constants/localStorageKeys'
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores'
import api from '@/utils/api'
import axios from 'axios'

vi.mock(`@/utils/api`, () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    setRefreshTokenFn: vi.fn()
  }
}))

vi.mock(`axios`, () => ({
  default: {
    post: vi.fn()
  }
}))

const mockedApiPost = vi.mocked(api.post)
const mockedAxiosPost = vi.mocked(axios.post)

describe(`useAuthStore`, () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorage.clear()
    mockedApiPost.mockClear()
    mockedAxiosPost.mockClear()
  })

  it(`should login and set user`, () => {
    const store = useAuthStore()
    store.setAuthTokens({
      accessToken: `test-token`,
      refreshToken: `test-refresh`,
      expiresIn: 3600
    })
    store.setUser({
      user: { id: `1`, email: `john@example.com`, name: `John` }
    })

    expect(store.user).toStrictEqual({ id: `1`, email: `john@example.com`, name: `John` })
    expect(store.isAuthenticated).toBe(true)
  })

  it(`should logout and clear`, async () => {
    const store = useAuthStore()
    store.setAuthTokens({
      accessToken: `test-token`,
      refreshToken: `test-refresh`,
      expiresIn: 3600
    })
    store.setUser({
      user: { id: `1`, email: `x`, name: `x` }
    })
    await store.logout()

    expect(store.user).toBeNull()
    expect(store.isAuthenticated).toBe(false)
  })

  it(`revokes token with axios.post for Google logins`, async () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, `fake-token`)
    localStorage.setItem(IS_GOOGLE_LOGIN_KEY, `true`)
    const authStore = useAuthStore()

    await authStore.logout()

    expect(mockedAxiosPost).toHaveBeenCalledWith(
      googleOAuthConfig.REVOKE_URL,
      null,
      expect.objectContaining({
        params: { token: `fake-token` },
        timeout: 5000
      })
    )
  })

  it(`does not revoke token for non-Google login`, async () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, `fake-token`)
    const authStore = useAuthStore()
    await authStore.logout()

    expect(mockedAxiosPost).not.toHaveBeenCalled()
  })

  it(`does not call axios if no token`, async () => {
    const authStore = useAuthStore()
    await authStore.logout()

    expect(mockedAxiosPost).not.toHaveBeenCalled()
  })

  it(`clears storage even if revoke fails`, async () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, `bad-token`)
    localStorage.setItem(IS_GOOGLE_LOGIN_KEY, `true`)
    mockedAxiosPost.mockRejectedValue(new Error(`Network error`))

    const authStore = useAuthStore()
    await authStore.logout()

    expect(mockedAxiosPost).toHaveBeenCalled()
    expect(localStorage.getItem(`access_token`)).toBeNull()
    expect(authStore.user).toBeNull()
  })

  it(`should clear all auth-related items from localStorage`, () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, `test-token`)
    localStorage.setItem(REFRESH_TOKEN_KEY, `test-refresh`)
    localStorage.setItem(TOKEN_EXPIRES_AT_KEY, `12345`)
    localStorage.setItem(USER_KEY, `test-user`)
    localStorage.setItem(IS_GOOGLE_LOGIN_KEY, `true`)

    const store = useAuthStore()

    store.clearAuthStorage()

    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull()
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull()
    expect(localStorage.getItem(TOKEN_EXPIRES_AT_KEY)).toBeNull()
    expect(localStorage.getItem(USER_KEY)).toBeNull()
    expect(localStorage.getItem(IS_GOOGLE_LOGIN_KEY)).toBeNull()
  })

  describe(`initial state`, () => {
    it(`should initialize with a null user if the stored token is expired`, () => {
      const user = { id: `1`, name: `Test User`, email: `test@test.com` }
      localStorage.setItem(USER_KEY, JSON.stringify(user))
      localStorage.setItem(TOKEN_EXPIRES_AT_KEY, String(Date.now() - 1000)) // Expired 1s ago

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
      localStorage.setItem(ACCESS_TOKEN_KEY, `abc123`)
      localStorage.setItem(TOKEN_EXPIRES_AT_KEY, String(Date.now() + 3600000))
      const store = useAuthStore()

      await expect(store.getToken()).resolves.toBe(`abc123`)
    })

    it(`should return null and logout on expired token`, async () => {
      localStorage.setItem(ACCESS_TOKEN_KEY, `abc123`)
      localStorage.setItem(TOKEN_EXPIRES_AT_KEY, String(Date.now() - 1000))
      const store = useAuthStore()
      const logoutSpy = vi.spyOn(store, `logout`)

      await expect(store.getToken()).resolves.toBeNull()
      expect(logoutSpy).toHaveBeenCalled()
    })

    it(`should only trigger one refresh for concurrent calls`, async () => {
      localStorage.setItem(ACCESS_TOKEN_KEY, `old-access`)
      localStorage.setItem(TOKEN_EXPIRES_AT_KEY, String(Date.now() + 30000)) // Near expiry
      localStorage.setItem(REFRESH_TOKEN_KEY, `refresh-me`)

      mockedApiPost.mockResolvedValue({
        data: { access_token: `new-fresh-access`, expires_in: 3600 }
      })

      const store = useAuthStore()
      const promises = [store.getToken(), store.getToken(), store.getToken()]
      const results = await Promise.all(promises)

      expect(results).toStrictEqual([`new-fresh-access`, `new-fresh-access`, `new-fresh-access`])
      expect(api.post).toHaveBeenCalledExactlyOnceWith(`/api/auth/refresh`,
        { refresh_token: `refresh-me` }, expect.anything())
    })
  })

  describe(`isTokenFreshEnough`, () => {
    const BUFFER_MS = 5 * 60 * 1000

    it(`should return true if the token expires after the buffer time`, () => {
      const store = useAuthStore()
      const expiresAt = Date.now() + BUFFER_MS + 1000 // Expires in 5m and 1s
      localStorage.setItem(TOKEN_EXPIRES_AT_KEY, String(expiresAt))

      expect(store.isTokenFreshEnough()).toBe(true)
    })

    it(`should return false if the token expires within the buffer time`, () => {
      const store = useAuthStore()
      const expiresAt = Date.now() + BUFFER_MS - 1000 // Expires in 4m and 59s
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
      localStorage.setItem(REFRESH_TOKEN_KEY, `old-refresh`)
      mockedApiPost.mockResolvedValue({
        data: { access_token: `new-access`, expires_in: 3600 }
      })

      const store = useAuthStore()
      const result = await store.refreshAccessToken()

      expect(result).toBe(`new-access`)
      expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBe(`new-access`)

      const expiresAt = Number(localStorage.getItem(TOKEN_EXPIRES_AT_KEY))

      expect(expiresAt).toBeGreaterThan(Date.now() + 3500000)
    })

    it(`updates refresh token if rotated token is returned`, async () => {
      localStorage.setItem(REFRESH_TOKEN_KEY, `old-refresh`)
      mockedApiPost.mockResolvedValue({
        data: {
          access_token: `new-access`,
          expires_in: 3600,
          refresh_token: `new-rotated-refresh`
        }
      })

      const store = useAuthStore()
      await store.refreshAccessToken()

      expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe(`new-rotated-refresh`)
    })

    it(`returns null on API error`, async () => {
      localStorage.setItem(REFRESH_TOKEN_KEY, `bad-refresh`)
      mockedApiPost.mockRejectedValue(new Error(`network error`))

      const store = useAuthStore()
      const result = await store.refreshAccessToken()

      expect(result).toBeNull()
    })

    it(`returns null if no access_token in response`, async () => {
      localStorage.setItem(REFRESH_TOKEN_KEY, `old-refresh`)
      mockedApiPost.mockResolvedValue({ data: { expires_in: 3600 } })

      const store = useAuthStore()
      const result = await store.refreshAccessToken()

      expect(result).toBeNull()
    })

    it(`restores user from localStorage on successful refresh if state is null`, async () => {
      const user = { id: `1`, name: `Test User`, email: `test@test.com` }
      localStorage.setItem(USER_KEY, JSON.stringify(user))
      localStorage.setItem(REFRESH_TOKEN_KEY, `old-refresh`)
      mockedApiPost.mockResolvedValue({
        data: { access_token: `new-access`, expires_in: 3600 }
      })

      const store = useAuthStore()

      expect(store.user).toBeNull()

      await store.refreshAccessToken()

      expect(store.user).toStrictEqual(user)
      expect(store.isAuthenticated).toBe(true)
    })
  })

  it(`auto-refreshes near-expiry token`, async () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, `old-access`)
    localStorage.setItem(TOKEN_EXPIRES_AT_KEY, String(Date.now() + 30000)) // 30s left
    localStorage.setItem(REFRESH_TOKEN_KEY, `refresh-me`)

    mockedApiPost.mockResolvedValue({
      data: { access_token: `fresh-access`, expires_in: 3600 }
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

      expect(api.setRefreshTokenFn).toHaveBeenCalled()
      expect(scheduleRefreshSpy).toHaveBeenCalled()
    })

    it(`should not schedule a refresh if no token exists`, () => {
      const store = useAuthStore()
      const scheduleRefreshSpy = vi.spyOn(store, `scheduleProactiveRefresh`)

      store.init()

      expect(api.setRefreshTokenFn).toHaveBeenCalled()
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
        accessToken: `test-token`,
        refreshToken: `test-refresh`,
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

    it(`cancels the proactive refresh on logout`, async () => {
      const store = useAuthStore()
      const refreshSpy = vi.spyOn(store, `refreshAccessToken`)

      store.setAuthTokens({
        accessToken: `test-token`,
        refreshToken: `test-refresh`,
        expiresIn: 3600
      })

      await store.logout()

      // Advance time past the 55-minute mark
      vi.advanceTimersByTime(56 * 60 * 1000)

      expect(refreshSpy).not.toHaveBeenCalled()
    })
  })
})
