import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAuth } from '@/composables/useAuth'
import { useAuthStore } from '@/stores'
import { setActivePinia, createPinia } from 'pinia'
import api from '@/utils/api'

vi.mock('@/utils/api', () => ({
  default: {
    post: vi.fn()
  }
}))

describe('useAuth', () => {
  const mockPost = vi.mocked(api.post)

  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('should return null token when not set', async () => {
    const { getToken } = useAuth()
    expect(await getToken()).toBeNull()
  })

  it('should return token when valid', async () => {
    localStorage.setItem('access_token', 'abc123')
    localStorage.setItem('token_expires_at', String(Date.now() + 3600000))
    const { getToken } = useAuth()
    expect(await getToken()).toBe('abc123')
  })

  it('should return null and logout on expired token', async () => {
    localStorage.setItem('access_token', 'abc123')
    localStorage.setItem('token_expires_at', String(Date.now() - 1000))
    const store = useAuthStore()
    const logoutSpy = vi.spyOn(store, 'logout')
    const { getToken } = useAuth()
    expect(await getToken()).toBeNull()
    expect(logoutSpy).toHaveBeenCalled()
  })

  it('should validate token correctly', () => {
    const { isTokenValid } = useAuth()
    expect(isTokenValid()).toBe(false)
    localStorage.setItem('token_expires_at', String(Date.now() + 3600000))
    expect(isTokenValid()).toBe(true)
  })

  describe('refreshAccessToken', () => {
    it('returns null if no refresh_token', async () => {
      const { refreshAccessToken } = useAuth()
      expect(await refreshAccessToken()).toBe(null)
    })

    it('refreshes token and updates storage on success', async () => {
      localStorage.setItem('refresh_token', 'old-refresh')
      mockPost.mockResolvedValue({
        data: { access_token: 'new-access', expires_in: 3600 }
      })

      const { refreshAccessToken } = useAuth()
      const result = await refreshAccessToken()

      expect(result).toBe('new-access')

      expect(mockPost).toHaveBeenCalledWith(
        'http://localhost:3001/api/auth/refresh',
        expect.objectContaining({
          refresh_token: 'old-refresh'
        })
      )

      expect(localStorage.getItem('access_token')).toBe('new-access')

      const expiresAt = Number(localStorage.getItem('token_expires_at'))
      expect(expiresAt).toBeGreaterThan(Date.now() + 3500000)
    })

    it('returns null on API error', async () => {
      localStorage.setItem('refresh_token', 'bad-refresh')
      mockPost.mockRejectedValue(new Error('network error'))

      const { refreshAccessToken } = useAuth()
      const result = await refreshAccessToken()

      expect(result).toBeNull()
      expect(localStorage.getItem('access_token')).toBeNull()
    })

    it('returns null if no access_token in response', async () => {
      localStorage.setItem('refresh_token', 'old-refresh')
      mockPost.mockResolvedValue({ data: { expires_in: 3600 } })

      const { refreshAccessToken } = useAuth()
      const result = await refreshAccessToken()

      expect(result).toBeNull()
    })
  })

  it('auto-refreshes near-expiry token', async () => {
    localStorage.setItem('access_token', 'old-access')
    localStorage.setItem('token_expires_at', String(Date.now() + 30000)) // 30s left
    localStorage.setItem('refresh_token', 'refresh-me')

    mockPost.mockResolvedValue({
      data: { access_token: 'fresh-access', expires_in: 3600 }
    })

    const { getToken } = useAuth()
    const token = await getToken()

    expect(token).toBe('fresh-access')
    expect(mockPost).toHaveBeenCalled()
  })
})