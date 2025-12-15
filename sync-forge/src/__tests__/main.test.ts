import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAuthStore } from '@/stores'
import { apiClient } from '@/services/apiClient'
import type { User } from '@/types/auth'
import { ApiEndpoints } from '@/constants/apiEndpoints'

vi.mock(`@/services/apiClient`, () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn()
  }
}))

const mockedApiClientGet = vi.mocked(apiClient.get)

const mockUser: User = { id: `1`, name: `Test User`, email: `test@example.com` }

describe(`main.ts`, () => {
  beforeEach(() => {
    document.body.innerHTML = `<div id="app"></div>`
    vi.resetModules()
    vi.clearAllMocks()
  })

  it(`initializes the auth store by calling fetchUser`, async () => {
    mockedApiClientGet.mockResolvedValueOnce({ data: mockUser })

    await import(`@/main`)

    const authStore = useAuthStore()

    expect(mockedApiClientGet).toHaveBeenCalledWith(ApiEndpoints.ME)
    expect(authStore.user).toStrictEqual(mockUser)
    expect(authStore.isAuthenticated).toBe(true)
  })

  it(`clears user state when API call fails`, async () => {
    mockedApiClientGet.mockRejectedValueOnce(new Error(`Unauthorized`))

    await import(`@/main`)

    const authStore = useAuthStore()

    expect(mockedApiClientGet).toHaveBeenCalledExactlyOnceWith(ApiEndpoints.ME)
    expect(authStore.user).toBeNull()
    expect(authStore.isAuthenticated).toBe(false)
  })
})


