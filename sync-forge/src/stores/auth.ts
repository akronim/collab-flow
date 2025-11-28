import { ApiEndpoints, googleOAuthEndpoints } from '@/constants/apiEndpoints'
import {
  ACCESS_TOKEN_KEY,
  ID_TOKEN_KEY,
  IS_GOOGLE_LOGIN_KEY,
  REFRESH_TOKEN_KEY,
  TOKEN_EXPIRES_AT_KEY,
  USER_KEY,
  CODE_VERIFIER_KEY
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
    hasRefreshToken(): boolean {
      return !!localStorage.getItem(REFRESH_TOKEN_KEY)
    },

    init() {
      api.setRefreshTokenFn(this.refreshAccessToken.bind(this))

      const expiresAt = localStorage.getItem(TOKEN_EXPIRES_AT_KEY)
      if (!expiresAt || !this.user) {
        return
      }

      const expiresInSeconds = (Number(expiresAt) - Date.now()) / 1000

      this.scheduleProactiveRefresh(expiresInSeconds)
    },

    cancelProactiveRefresh() {
      if (this.proactiveRefreshTimer) {
        clearTimeout(this.proactiveRefreshTimer)
        this.proactiveRefreshTimer = null
      }
    },

    scheduleProactiveRefresh(expiresInSeconds: number) {
      this.cancelProactiveRefresh()

      // refresh 5 minutes before expiry
      const BUFFER_TIME_MS = 5 * 60 * 1000

      const timeoutMs = Math.max(0, (expiresInSeconds * 1000) - BUFFER_TIME_MS)

      Logger.log(`Proactive refresh scheduled in ${(timeoutMs / 1000 / 60).toFixed(1)} min`)

      this.proactiveRefreshTimer = setTimeout(async () => {
        if (this.isTokenFreshEnough()) {
          // just reschedule
          const newExpiresAt = Number(localStorage.getItem(TOKEN_EXPIRES_AT_KEY))
          const newRemaining = (newExpiresAt - Date.now()) / 1000
          this.scheduleProactiveRefresh(newRemaining)
          return
        }

        await this.refreshAccessToken()
      }, timeoutMs)
    },

    isTokenFreshEnough(): boolean {
      const expiresAt = Number(localStorage.getItem(TOKEN_EXPIRES_AT_KEY))
      const BUFFER_TIME_MS = 5 * 60 * 1000
      return Date.now() < (expiresAt - BUFFER_TIME_MS)
    },

    setAuthTokens(payload: {
      accessToken: string
      idToken: string
      refreshToken: string
      expiresIn: number
      isGoogleLogin?: boolean
    }) {
      const expiresAt = Date.now() + payload.expiresIn * 1000
      localStorage.setItem(ACCESS_TOKEN_KEY, payload.accessToken)
      localStorage.setItem(ID_TOKEN_KEY, payload.idToken)
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
      [
        ACCESS_TOKEN_KEY,
        ID_TOKEN_KEY,
        REFRESH_TOKEN_KEY,
        TOKEN_EXPIRES_AT_KEY,
        USER_KEY,
        IS_GOOGLE_LOGIN_KEY
      ].forEach((key) => localStorage.removeItem(key))
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
        await axios.post(googleOAuthEndpoints.REVOKE_URL, null, {
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
            ApiEndpoints.AUTH_REFRESH,
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

          this.scheduleProactiveRefresh(Number(expires_in))

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
    },

    setPkceCodeVerifier(verifier: string): void {
      localStorage.setItem(CODE_VERIFIER_KEY, verifier)
    },

    getPkceCodeVerifier(): string | null {
      return localStorage.getItem(CODE_VERIFIER_KEY)
    },

    clearPkceCodeVerifier(): void {
      localStorage.removeItem(CODE_VERIFIER_KEY)
    }
  }
})
