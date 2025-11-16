import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores'
import axios from 'axios'

vi.mock('axios', () => {
  const mockAxiosInstance = {
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
    post: vi.fn(),
    get: vi.fn(),
  }
  return {
    default: {
      create: () => mockAxiosInstance,
      post: vi.fn(),
    },
  }
})

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('should login and set user', () => {
    const store = useAuthStore()
    store.login({ id: '1', email: 'john@example.com', name: 'John' })
    expect(store.user).toEqual({ id: '1', email: 'john@example.com', name: 'John' })
    expect(store.isAuthenticated).toBe(true)
  })

  it('should logout and clear', async () => {
    const store = useAuthStore()
    store.login({ id: '1', email: 'x', name: 'x' })
    await store.logout()
    expect(store.user).toBeNull()
    expect(store.isAuthenticated).toBe(false)
  })

  it('revokes token with axios.post', async () => {
    localStorage.setItem('access_token', 'fake-token')
    const authStore = useAuthStore()

    await authStore.logout()

    expect(axios.post).toHaveBeenCalledWith(
      'https://oauth2.googleapis.com/revoke',
      null,
      expect.objectContaining({
        params: { token: 'fake-token' },
        timeout: 5000,
      })
    )
  })

  it('does not call axios if no token', async () => {
    const authStore = useAuthStore()
    await authStore.logout()
    expect(axios.post).not.toHaveBeenCalled()
  })

  it('clears storage even if revoke fails', async () => {
    localStorage.setItem('access_token', 'bad-token')
    vi.mocked(axios.post).mockRejectedValue(new Error('Network error'))

    const authStore = useAuthStore()
    await authStore.logout()

    expect(axios.post).toHaveBeenCalled()
    expect(localStorage.getItem('access_token')).toBeNull()
    expect(authStore.user).toBeNull()
  })

  describe('getToken', () => {
    it('should return null token when not set', async () => {
      const store = useAuthStore()
      expect(await store.getToken()).toBeNull()
    })

    it('should return token when valid', async () => {
      localStorage.setItem('access_token', 'abc123')
      localStorage.setItem('token_expires_at', String(Date.now() + 3600000))
      const store = useAuthStore()
      expect(await store.getToken()).toBe('abc123')
    })

    it('should return null and logout on expired token', async () => {
      localStorage.setItem('access_token', 'abc123')
      localStorage.setItem('token_expires_at', String(Date.now() - 1000))
      const store = useAuthStore()
      const logoutSpy = vi.spyOn(store, 'logout')
      expect(await store.getToken()).toBeNull()
      expect(logoutSpy).toHaveBeenCalled()
    })
  })

  describe('isTokenValid', () => {
    it('should validate token correctly', () => {
      const store = useAuthStore()
      expect(store.isTokenValid()).toBe(false)
      localStorage.setItem('token_expires_at', String(Date.now() + 3600000))
      expect(store.isTokenValid()).toBe(true)
    })
  })

  describe('refreshAccessToken', () => {
    it('returns null if no refresh_token', async () => {
      const store = useAuthStore()
      expect(await store.refreshAccessToken()).toBe(null)
    })

    it('refreshes token and updates storage on success', async () => {
      localStorage.setItem('refresh_token', 'old-refresh')
      const mockApi = axios.create()
      vi.mocked(mockApi.post).mockResolvedValue({
        data: { access_token: 'new-access', expires_in: 3600 },
      })

      const store = useAuthStore()
      const result = await store.refreshAccessToken()

      expect(result).toBe('new-access')
      expect(localStorage.getItem('access_token')).toBe('new-access')

      const expiresAt = Number(localStorage.getItem('token_expires_at'))
      expect(expiresAt).toBeGreaterThan(Date.now() + 3500000)
    })

    it('returns null on API error', async () => {
      localStorage.setItem('refresh_token', 'bad-refresh')
      const mockApi = axios.create()
      vi.mocked(mockApi.post).mockRejectedValue(new Error('network error'))

      const store = useAuthStore()
      const result = await store.refreshAccessToken()

      expect(result).toBeNull()
    })

    it('returns null if no access_token in response', async () => {
      localStorage.setItem('refresh_token', 'old-refresh')
      const mockApi = axios.create()
      vi.mocked(mockApi.post).mockResolvedValue({ data: { expires_in: 3600 } })

      const store = useAuthStore()
      const result = await store.refreshAccessToken()

      expect(result).toBeNull()
    })
  })

  it('auto-refreshes near-expiry token', async () => {
    localStorage.setItem('access_token', 'old-access')
    localStorage.setItem('token_expires_at', String(Date.now() + 30000)) // 30s left
    localStorage.setItem('refresh_token', 'refresh-me')

    const mockApi = axios.create()
    vi.mocked(mockApi.post).mockResolvedValue({
      data: { access_token: 'fresh-access', expires_in: 3600 },
    })

    const store = useAuthStore()
    const token = await store.getToken()

    expect(token).toBe('fresh-access')
  })


  describe('token refresh interval', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('starts refresh interval on init', () => {
      const store = useAuthStore()
      const getTokenSpy = vi.spyOn(store, 'getToken')

      store.login({ id: '1', email: 'test@example.com', name: 'Test' })
      store.init()

      // Fast-forward 10 minutes
      vi.advanceTimersByTime(10 * 60 * 1000)

      expect(getTokenSpy).toHaveBeenCalled()
    })

    it('does not refresh if user is not authenticated', () => {
      const store = useAuthStore()
      const getTokenSpy = vi.spyOn(store, 'getToken')

      store.init()

      // Fast-forward 10 minutes
      vi.advanceTimersByTime(10 * 60 * 1000)

      expect(getTokenSpy).not.toHaveBeenCalled()
    })

    it('clears interval on logout', async () => {
      const store = useAuthStore()
      const getTokenSpy = vi.spyOn(store, 'getToken')

      store.login({ id: '1', email: 'test@example.com', name: 'Test' })
      store.init()

      await store.logout()

      // Fast-forward 10 minutes after logout
      vi.advanceTimersByTime(10 * 60 * 1000)

      expect(getTokenSpy).not.toHaveBeenCalled()
    })

    it('refreshes token periodically while authenticated', () => {
      const store = useAuthStore()
      const getTokenSpy = vi.spyOn(store, 'getToken')

      store.login({ id: '1', email: 'test@example.com', name: 'Test' })
      store.init()

      // Fast-forward 30 minutes (should call 3 times)
      vi.advanceTimersByTime(30 * 60 * 1000)

      expect(getTokenSpy).toHaveBeenCalledTimes(3)
    })
  })
})
