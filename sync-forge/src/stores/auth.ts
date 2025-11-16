import axios from 'axios'
import { defineStore } from 'pinia'
import api from '@/utils/api'
import type { User } from '@/types/auth'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

interface AuthState {
  user: User | null
  refreshIntervalId?: ReturnType<typeof setInterval>
}

const getSavedUser = (): User | null => {
  const savedUser = localStorage.getItem('user')
  const expiresAt = localStorage.getItem('token_expires_at')

  if (savedUser && expiresAt && Date.now() < Number(expiresAt)) {
    try {
      return JSON.parse(savedUser)
    } catch (e) {
      console.warn('Failed to parse saved user', e)
      return null
    }
  }
  return null
}

export const useAuthStore = defineStore('auth', {

  state: (): AuthState => ({
    user: getSavedUser(),
    refreshIntervalId: undefined
  }),

  getters: {
    isAuthenticated: (state) => !!state.user,
  },

  actions: {
    init() {
      api.setRefreshTokenFn(this.refreshAccessToken)
      this.startTokenRefreshInterval()
    },

    startTokenRefreshInterval() {
      if (this.refreshIntervalId) {
        clearInterval(this.refreshIntervalId)
      }

      this.refreshIntervalId = setInterval(() => {
        if (this.isAuthenticated) {
          this.getToken()
        }
      }, 10 * 60 * 1000) // 10 minutes
    },

    login(payload: User) {
      this.user = payload
      localStorage.setItem('user', JSON.stringify(payload))
    },

    async revokeGoogleToken() {
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
    },

    async logout() {
      await this.revokeGoogleToken()

      if (this.refreshIntervalId) {
        clearInterval(this.refreshIntervalId)
        this.refreshIntervalId = undefined
      }

      this.user = null
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('token_expires_at')
      localStorage.removeItem('user')
    },

    async refreshAccessToken(): Promise<string | null> {
      const refresh = localStorage.getItem('refresh_token')
      if (!refresh) return null

      try {
        const resp = await api.post(`${BACKEND_URL}/api/auth/refresh`, {
          refresh_token: refresh,
        })
        const { access_token, expires_in } = resp.data
        if (!access_token) return null

        const expiresAt = Date.now() + Number(expires_in) * 1000
        localStorage.setItem('access_token', access_token)
        localStorage.setItem('token_expires_at', String(expiresAt))
        return access_token
      } catch (err) {
        console.error('Refresh failed:', err)
        this.logout()
        return null
      }
    },

    async getToken(): Promise<string | null> {
      const token = localStorage.getItem('access_token')
      const expiresAt = localStorage.getItem('token_expires_at')

      if (!token || !expiresAt) {
        this.logout()
        return null
      }

      const expiresInMs = Number(expiresAt) - Date.now()
      if (expiresInMs > 60_000) return token

      const newToken = await this.refreshAccessToken()
      if (newToken) return newToken

      this.logout()
      return null
    },

    isTokenValid() {
      const expiresAt = localStorage.getItem('token_expires_at')
      return expiresAt ? Date.now() < Number(expiresAt) - 60_000 : false
    },
  },
})
