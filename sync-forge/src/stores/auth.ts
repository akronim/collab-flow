import axios from 'axios'
import { defineStore } from 'pinia'
import api, { type AxConfig } from '@/utils/api'
import type { User } from '@/types/auth'

interface AuthState {
  user: User | null
  activeRefreshPromise: Promise<string | null> | null
}

const getSavedUser = (): User | null => {
  const savedUser = localStorage.getItem('user')
  const expiresAt = localStorage.getItem('token_expires_at')

  if (savedUser && expiresAt) {
    try {
      const user = JSON.parse(savedUser)
      if (Date.now() < Number(expiresAt)) {
        return user
      }
    } catch (e) {
      console.warn('Failed to parse saved user', e)
    }
  }
  return null
}

export const useAuthStore = defineStore('auth', {

  state: (): AuthState => ({
    user: getSavedUser(),
    activeRefreshPromise: null
  }),

  getters: {
    isAuthenticated: (state) => !!state.user,
  },

  actions: {
    init() {
      api.setRefreshTokenFn(this.refreshAccessToken.bind(this))
    },

    setSession(payload: {
      user: User
      accessToken: string
      refreshToken: string
      expiresIn: number
      isGoogleLogin?: boolean
    }) {
      const expiresAt = Date.now() + payload.expiresIn * 1000
      this.user = payload.user
      localStorage.setItem('user', JSON.stringify(payload.user))
      localStorage.setItem('access_token', payload.accessToken)
      localStorage.setItem('refresh_token', payload.refreshToken)
      localStorage.setItem('token_expires_at', String(expiresAt))
      if (payload.isGoogleLogin) {
        localStorage.setItem('is_google_login', 'true')
      }
    },

    clearAuthStorage() {
      ['access_token', 'refresh_token', 'token_expires_at', 'user', 'is_google_login'].forEach(key =>
        localStorage.removeItem(key)
      )
    },

    async revokeGoogleToken() {
      if (localStorage.getItem('is_google_login') !== 'true') return

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
      this.user = null
      this.clearAuthStorage()
    },

    refreshAccessToken(): Promise<string | null> {
      if (this.activeRefreshPromise) {
        return this.activeRefreshPromise
      }

      this.activeRefreshPromise = (async () => {
        const refreshToken = localStorage.getItem('refresh_token')
        if (!refreshToken) {
          await this.logout()
          return null
        }

        try {
          const { data } = await api.post(
            '/api/auth/refresh',
            {
              refresh_token: refreshToken,
            },
            { _retry: true } as AxConfig // Prevent this request from triggering the refresh interceptor
          )

          const { access_token, expires_in, refresh_token: new_refresh_token } = data

          if (!access_token) {
            await this.logout()
            return null
          }

          const expiresAt = Date.now() + Number(expires_in) * 1000
          localStorage.setItem('access_token', access_token)
          localStorage.setItem('token_expires_at', String(expiresAt))
          if (new_refresh_token) {
            localStorage.setItem('refresh_token', new_refresh_token)
          }

          if (!this.user) {
            const savedUser = localStorage.getItem('user')
            if (savedUser) {
              try {
                this.user = JSON.parse(savedUser)
              } catch (e) {
                console.warn('Failed to parse saved user after refresh', e)
                await this.logout()
                return null
              }
            }
          }

          return access_token
        } catch (err) {
          console.error('Token refresh failed:', err)
          await this.logout()
          return null
        }
      })().finally(() => {
        this.activeRefreshPromise = null
      })

      return this.activeRefreshPromise
    },

    async getToken(): Promise<string | null> {
      const token = localStorage.getItem('access_token')
      const expiresAt = localStorage.getItem('token_expires_at')

      if (!token || !expiresAt) {
        return null
      }

      const expiresInMs = Number(expiresAt) - Date.now()

      if (expiresInMs > 60_000) {
        return token
      }

      return this.refreshAccessToken()
    },

    isTokenValid(): boolean {
      const expiresAt = localStorage.getItem('token_expires_at')
      if (!expiresAt) return false

      return Date.now() < Number(expiresAt) - 60_000
    },
  },
})