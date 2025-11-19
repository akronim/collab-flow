import { describe, it, expect, beforeEach, vi } from 'vitest'
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

describe(`useAuthStore`, () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorage.clear()
    const mockedApiPost = vi.mocked(api.post)
    const mockedAxiosPost = vi.mocked(axios.post)
    mockedApiPost.mockClear()
    mockedAxiosPost.mockClear()
  })

  it(`should login and set user`, () => {
    const store = useAuthStore()
    store.setSession({
      user: { id: `1`, email: `john@example.com`, name: `John` },
      accessToken: `test-token`,
      refreshToken: `test-refresh`,
      expiresIn: 3600
    })

    expect(store.user).toStrictEqual({ id: `1`, email: `john@example.com`, name: `John` })
    expect(store.isAuthenticated).toBe(true)
  })

  it(`should logout and clear`, async () => {
    const store = useAuthStore()
    store.setSession({
      user: { id: `1`, email: `x`, name: `x` },
      accessToken: `test-token`,
      refreshToken: `test-refresh`,
      expiresIn: 3600
    })
    await store.logout()

    expect(store.user).toBeNull()
    expect(store.isAuthenticated).toBe(false)
  })

  it(`revokes token with axios.post for Google logins`, async () => {
    localStorage.setItem(`access_token`, `fake-token`)
    localStorage.setItem(`is_google_login`, `true`)
    const authStore = useAuthStore()

    await authStore.logout()

    expect(axios.post).toHaveBeenCalledWith(
      `https://oauth2.googleapis.com/revoke`,
      null,
      expect.objectContaining({
        params: { token: `fake-token` },
        timeout: 5000
      })
    )
  })

  it(`does not revoke token for non-Google login`, async () => {
    localStorage.setItem(`access_token`, `fake-token`)
    const authStore = useAuthStore()
    await authStore.logout()

    expect(axios.post).not.toHaveBeenCalled()
  })

  it(`does not call axios if no token`, async () => {
    const authStore = useAuthStore()
    await authStore.logout()

    expect(axios.post).not.toHaveBeenCalled()
  })

  it(`clears storage even if revoke fails`, async () => {
    localStorage.setItem(`access_token`, `bad-token`)
    localStorage.setItem(`is_google_login`, `true`)
    ; (vi.mocked(axios.post)).mockRejectedValue(new Error(`Network error`))

    const authStore = useAuthStore()
    await authStore.logout()

    expect(axios.post).toHaveBeenCalled()
    expect(localStorage.getItem(`access_token`)).toBeNull()
    expect(authStore.user).toBeNull()
  })

  describe(`getToken`, () => {
    it(`should return null token when not set`, async () => {
      const store = useAuthStore()

      await expect(store.getToken()).resolves.toBeNull()
    })

    it(`should return token when valid`, async () => {
      localStorage.setItem(`access_token`, `abc123`)
      localStorage.setItem(`token_expires_at`, String(Date.now() + 3600000))
      const store = useAuthStore()

      await expect(store.getToken()).resolves.toBe(`abc123`)
    })

    it(`should return null and logout on expired token`, async () => {
      localStorage.setItem(`access_token`, `abc123`)
      localStorage.setItem(`token_expires_at`, String(Date.now() - 1000))
      const store = useAuthStore()
      const logoutSpy = vi.spyOn(store, `logout`)

      await expect(store.getToken()).resolves.toBeNull()
      expect(logoutSpy).toHaveBeenCalled()
    })

    it(`should only trigger one refresh for concurrent calls`, async () => {
      localStorage.setItem(`access_token`, `old-access`)
      localStorage.setItem(`token_expires_at`, String(Date.now() + 30000)) // Near expiry
      localStorage.setItem(`refresh_token`, `refresh-me`)

      ; (vi.mocked(api.post)).mockResolvedValue({
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

  describe(`isTokenValid`, () => {
    it(`should validate token correctly`, () => {
      const store = useAuthStore()

      expect(store.isTokenValid()).toBe(false)

      localStorage.setItem(`token_expires_at`, String(Date.now() + 3600000))

      expect(store.isTokenValid()).toBe(true)
    })
  })

  describe(`refreshAccessToken`, () => {
    it(`returns null if no refresh_token`, async () => {
      const store = useAuthStore()

      await expect(store.refreshAccessToken()).resolves.toBeNull()
    })

    it(`refreshes access token and updates storage on success`, async () => {
      localStorage.setItem(`refresh_token`, `old-refresh`)
      ; (vi.mocked(api.post)).mockResolvedValue({
        data: { access_token: `new-access`, expires_in: 3600 }
      })

      const store = useAuthStore()
      const result = await store.refreshAccessToken()

      expect(result).toBe(`new-access`)
      expect(localStorage.getItem(`access_token`)).toBe(`new-access`)

      const expiresAt = Number(localStorage.getItem(`token_expires_at`))

      expect(expiresAt).toBeGreaterThan(Date.now() + 3500000)
    })

    it(`updates refresh token if rotated token is returned`, async () => {
      localStorage.setItem(`refresh_token`, `old-refresh`)
      ; (vi.mocked(api.post)).mockResolvedValue({
        data: {
          access_token: `new-access`,
          expires_in: 3600,
          refresh_token: `new-rotated-refresh`
        }
      })

      const store = useAuthStore()
      await store.refreshAccessToken()

      expect(localStorage.getItem(`refresh_token`)).toBe(`new-rotated-refresh`)
    })

    it(`returns null on API error`, async () => {
      localStorage.setItem(`refresh_token`, `bad-refresh`)
      ; (vi.mocked(api.post)).mockRejectedValue(new Error(`network error`))

      const store = useAuthStore()
      const result = await store.refreshAccessToken()

      expect(result).toBeNull()
    })

    it(`returns null if no access_token in response`, async () => {
      localStorage.setItem(`refresh_token`, `old-refresh`)
      ; (vi.mocked(api.post)).mockResolvedValue({ data: { expires_in: 3600 } })

      const store = useAuthStore()
      const result = await store.refreshAccessToken()

      expect(result).toBeNull()
    })

    it(`restores user from localStorage on successful refresh if state is null`, async () => {
      const user = { id: `1`, name: `Test User`, email: `test@test.com` }
      localStorage.setItem(`user`, JSON.stringify(user))
      localStorage.setItem(`refresh_token`, `old-refresh`)
      ; (vi.mocked(api.post)).mockResolvedValue({
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
    localStorage.setItem(`access_token`, `old-access`)
    localStorage.setItem(`token_expires_at`, String(Date.now() + 30000)) // 30s left
    localStorage.setItem(`refresh_token`, `refresh-me`)

    ; (vi.mocked(api.post)).mockResolvedValue({
      data: { access_token: `fresh-access`, expires_in: 3600 }
    })

    const store = useAuthStore()
    const token = await store.getToken()

    expect(token).toBe(`fresh-access`)
  })
})
