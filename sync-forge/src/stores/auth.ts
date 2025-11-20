import { googleOAuthConfig } from '@/constants'
import {
  ACCESS_TOKEN_KEY,
  IS_GOOGLE_LOGIN_KEY,
  REFRESH_TOKEN_KEY,
  TOKEN_EXPIRES_AT_KEY,
  USER_KEY
} from '@/constants/localStorageKeys'
import type { User } from '@/types/auth'
import api, { type AxConfig } from '@/utils/api'
import Logger from '@/utils/logger'
import axios from 'axios'
import { defineStore } from 'pinia'

interface AuthState {
  user: User | null
  activeRefreshPromise: Promise<string | null> | null
  proactiveRefreshTimer: ReturnType<typeof setTimeout> | null
}

const getSavedUser = (): User | null => {
  const savedUser = localStorage.getItem(USER_KEY)
  const expiresAt = localStorage.getItem(TOKEN_EXPIRES_AT_KEY)

  if (savedUser && expiresAt) {
    try {
      const user = JSON.parse(savedUser)
      if (Date.now() < Number(expiresAt)) {
        return user
      }
    } catch (e) {
      Logger.error(`Failed to parse saved user`, e)
    }
  }
  return null
}

export const useAuthStore = defineStore(`auth`, {
  state: (): AuthState => ({
    user: getSavedUser(),
    activeRefreshPromise: null,
    proactiveRefreshTimer: null
  }),

  getters: {
    isAuthenticated: (state) => !!state.user
  },

  actions: {
    init() {
      api.setRefreshTokenFn(this.refreshAccessToken.bind(this))
    },

    cancelProactiveRefresh() {
      if (this.proactiveRefreshTimer) {
        clearTimeout(this.proactiveRefreshTimer)
        this.proactiveRefreshTimer = null
      }
    },

    scheduleProactiveRefresh(expiresIn: number) {
      this.cancelProactiveRefresh()

      const fiveMinutes = 5 * 60 * 1000
      const timeout = expiresIn * 1000 - fiveMinutes

      if (timeout > 0) {
        this.proactiveRefreshTimer = setTimeout(() => {
          void this.refreshAccessToken()
        }, timeout)
      }
    },

    setAuthTokens(payload: {
      accessToken: string
      refreshToken: string
      expiresIn: number
      isGoogleLogin?: boolean
    }) {
      const expiresAt = Date.now() + payload.expiresIn * 1000
      localStorage.setItem(ACCESS_TOKEN_KEY, payload.accessToken)
      localStorage.setItem(REFRESH_TOKEN_KEY, payload.refreshToken)
      localStorage.setItem(TOKEN_EXPIRES_AT_KEY, String(expiresAt))
      if (payload.isGoogleLogin) {
        localStorage.setItem(IS_GOOGLE_LOGIN_KEY, `true`)
      }
      this.scheduleProactiveRefresh(payload.expiresIn)
    },

    setUser(payload: { user: User }) {
      this.user = payload.user
      localStorage.setItem(USER_KEY, JSON.stringify(payload.user))
    },

    clearAuthStorage() {
      [ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, TOKEN_EXPIRES_AT_KEY, USER_KEY, IS_GOOGLE_LOGIN_KEY].forEach((key) =>
        localStorage.removeItem(key)
      )
    },
    async revokeGoogleToken() {
      if (localStorage.getItem(IS_GOOGLE_LOGIN_KEY) !== `true`) {
        return
      }

      const token = localStorage.getItem(ACCESS_TOKEN_KEY)
      if (!token) {
        return
      }

      try {
        await axios.post(googleOAuthConfig.REVOKE_URL, null, {
          params: { token },
          timeout: 5000
        })
      } catch (err) {
        Logger.error(`Token revoke failed:`, (err as Error).message)
      }
    },

    async logout() {
      this.cancelProactiveRefresh()
      await this.revokeGoogleToken()
      this.user = null
      this.clearAuthStorage()
    },

    // eslint-disable-next-line max-lines-per-function
    refreshAccessToken(): Promise<string | null> {
      if (this.activeRefreshPromise) {
        return this.activeRefreshPromise
      }

      this.activeRefreshPromise = (async (): Promise<string | null> => {
        const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
        if (!refreshToken) {
          await this.logout()
          return null
        }

        try {
          const { data } = await api.post(
            `/api/auth/refresh`,
            {
              refresh_token: refreshToken
            },
            { _retry: true } as AxConfig // Prevent this request from triggering the refresh interceptor
          )

          const { access_token, expires_in, refresh_token: new_refresh_token } = data

          if (!access_token) {
            await this.logout()
            return null
          }

          const expiresAt = Date.now() + Number(expires_in) * 1000
          localStorage.setItem(ACCESS_TOKEN_KEY, access_token)
          localStorage.setItem(TOKEN_EXPIRES_AT_KEY, String(expiresAt))
          if (new_refresh_token) {
            localStorage.setItem(REFRESH_TOKEN_KEY, new_refresh_token)
          }

          if (!this.user) {
            const savedUser = localStorage.getItem(USER_KEY)
            if (savedUser) {
              try {
                this.user = JSON.parse(savedUser)
              } catch (e) {
                Logger.error(`Failed to parse saved user after refresh`, e)
                await this.logout()
                return null
              }
            }
          }

          return access_token
        } catch (err) {
          Logger.error(`Token refresh failed:`, err)
          await this.logout()
          return null
        }
      })().finally(() => {
        this.activeRefreshPromise = null
      })

      return this.activeRefreshPromise
    },

    async getToken(): Promise<string | null> {
      const token = localStorage.getItem(ACCESS_TOKEN_KEY)
      const expiresAt = localStorage.getItem(TOKEN_EXPIRES_AT_KEY)

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
      const expiresAt = localStorage.getItem(TOKEN_EXPIRES_AT_KEY)
      if (!expiresAt) {
        return false
      }

      return Date.now() < Number(expiresAt) - 60_000
    }
  }
})
