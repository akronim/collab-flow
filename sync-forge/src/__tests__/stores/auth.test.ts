import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores'
import { apiClient } from '@/http/apiClient'
import { ApiEndpoints } from '@/constants/apiEndpoints'
import { CODE_VERIFIER_KEY } from '@/constants/localStorageKeys'
import type { User } from '@/types/auth'

// Mock the apiClient
vi.mock(`@/http/apiClient`, () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn()
  }
}))

const mockedApiClientGet = vi.mocked(apiClient.get)
const mockedApiClientPost = vi.mocked(apiClient.post)

describe(`useAuthStore (Session-based)`, () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorage.clear()
    // Mock window.location.href for logout test
    Object.defineProperty(window, `location`, {
      value: { href: `` },
      writable: true
    })
  })

  it(`initializes with a null user and isAuthenticated is false`, () => {
    const store = useAuthStore()

    expect(store.user).toBeNull()
    expect(store.isAuthenticated).toBe(false)
  })

  describe(`fetchUser`, () => {
    it(`should fetch and set the user on success`, async () => {
      const store = useAuthStore()
      const mockUser: User = { id: `1`, name: `Test User`, email: `test@example.com` }
      mockedApiClientGet.mockResolvedValue({ data: mockUser })

      await store.fetchUser()

      expect(apiClient.get).toHaveBeenCalledWith(ApiEndpoints.ME)
      expect(store.user).toStrictEqual(mockUser)
      expect(store.isAuthenticated).toBe(true)
    })

    it(`should set user to null on failure`, async () => {
      const store = useAuthStore()
      mockedApiClientGet.mockRejectedValue(new Error(`Unauthorized`))

      await store.fetchUser()

      expect(apiClient.get).toHaveBeenCalledWith(ApiEndpoints.ME)
      expect(store.user).toBeNull()
      expect(store.isAuthenticated).toBe(false)
    })
  })

  describe(`logout`, () => {
    it(`should clear user state, call the backend, and redirect`, async () => {
      const store = useAuthStore()
      store.user = { id: `1`, name: `Test User`, email: `test@example.com` }
      mockedApiClientPost.mockResolvedValue({})

      await store.logout()

      expect(apiClient.post).toHaveBeenCalledWith(ApiEndpoints.AUTH_LOGOUT)
      expect(store.user).toBeNull()
      expect(store.isAuthenticated).toBe(false)
      expect(window.location.href).toBe(`/login`)
    })

    it(`should clear user state and redirect even if the backend call fails`, async () => {
      const store = useAuthStore()
      store.user = { id: `1`, name: `Test User`, email: `test@example.com` }
      mockedApiClientPost.mockRejectedValue(new Error(`Network Error`))

      await store.logout()

      expect(apiClient.post).toHaveBeenCalledWith(ApiEndpoints.AUTH_LOGOUT)
      expect(store.user).toBeNull()
      expect(store.isAuthenticated).toBe(false)
      expect(window.location.href).toBe(`/login`)
    })
  })

  describe(`PKCE Code Verifier`, () => {
    it(`should set and get the code verifier from localStorage`, () => {
      const store = useAuthStore()
      const verifier = `my-secret-verifier`
      store.setPkceCodeVerifier(verifier)

      expect(localStorage.getItem(CODE_VERIFIER_KEY)).toBe(verifier)
      expect(store.getPkceCodeVerifier()).toBe(verifier)
    })

    it(`should clear the code verifier from localStorage`, () => {
      const store = useAuthStore()
      const verifier = `my-secret-verifier`
      localStorage.setItem(CODE_VERIFIER_KEY, verifier)
      store.clearPkceCodeVerifier()

      expect(localStorage.getItem(CODE_VERIFIER_KEY)).toBeNull()
    })
  })
})
