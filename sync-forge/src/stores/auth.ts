import axios from 'axios'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<{ id: string; email: string; name: string } | null>(null)

  const token = localStorage.getItem('access_token')
  const expiresAt = localStorage.getItem('token_expires_at')
  const savedUser = localStorage.getItem('user')

  if (token && expiresAt && savedUser) {
    const isValid = Date.now() < Number(expiresAt)
    if (isValid) {
      try {
        user.value = JSON.parse(savedUser)
      } catch (e) {
        console.warn('Failed to parse saved user', e)
      }
    }
  }

  const login = (payload: { id: string; email: string; name: string }) => {
    user.value = payload
    localStorage.setItem('user', JSON.stringify(payload))
  }

  const revokeGoogleToken = async () => {
    const token = localStorage.getItem('access_token')
    if (!token) return

    try {
      await axios.post('https://oauth2.googleapis.com/revoke', null, {
        params: { token },
        timeout: 5000,
      })
    } catch (err) {
      console.warn('Token revoke failed:', (err as Error).message)
    }
  }

  const logout = async () => {
    await revokeGoogleToken()
    user.value = null
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('token_expires_at')
    localStorage.removeItem('user')
  }

  const isAuthenticated = () => !!user.value

  return { user, login, logout, isAuthenticated }
})