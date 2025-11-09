import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores'
import axios from 'axios'

vi.mock('axios')

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
    expect(store.isAuthenticated()).toBe(true)
  })

  it('should logout and clear', async () => {
    const store = useAuthStore()
    store.login({ id: '1', email: 'x', name: 'x' })
    await store.logout()
    expect(store.user).toBeNull()
    expect(store.isAuthenticated()).toBe(false)
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
})