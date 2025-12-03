import { ApiEndpoints } from '@/constants/apiEndpoints'
import { CODE_VERIFIER_KEY } from '@/constants/localStorageKeys'
import type { User } from '@/types/auth'
import { simpleApiClient } from '@/services/simpleApiClient'
import { authApiClient } from '@/services/authApiClient'
import Logger from '@/utils/logger'
import { defineStore } from 'pinia'
import { jwtDecode } from 'jwt-decode'

interface AuthState {
  user: User | null
  accessToken: string | null
  expiresAt: number | null
  activeRefreshPromise: Promise<string | null> | null
  proactiveRefreshTimer: ReturnType<typeof setTimeout> | null
}

export const useAuthStore = defineStore(`auth`, {
  state: (): AuthState => ({
    user: null,
    accessToken: null,
    expiresAt: null,
    activeRefreshPromise: null,
    proactiveRefreshTimer: null
  }),

  getters: {
    isAuthenticated: (state) => !!state.user
  },

  actions: {
    init() {
      authApiClient.setRefreshTokenFn(this.refreshAccessToken.bind(this))
      authApiClient.setGetTokenFn(() => this.accessToken)
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
          const newRemaining = ((this.expiresAt ?? 0) - Date.now()) / 1000
          this.scheduleProactiveRefresh(newRemaining)
          return
        }

        await this.refreshAccessToken()
      }, timeoutMs)
    },

    isTokenFreshEnough(): boolean {
      const BUFFER_TIME_MS = 5 * 60 * 1000
      return Date.now() < ((this.expiresAt ?? 0) - BUFFER_TIME_MS)
    },

    setAuthData(accessToken: string, expiresIn: number) {
      this.accessToken = accessToken
      this.expiresAt = Date.now() + expiresIn * 1000
      this.user = jwtDecode<User>(accessToken)

      this.scheduleProactiveRefresh(expiresIn)
    },

    clearAuthStorage() {
      localStorage.removeItem(CODE_VERIFIER_KEY)
    },

    async logout() {
      this.cancelProactiveRefresh()

      try {
        await simpleApiClient.post(ApiEndpoints.AUTH_LOGOUT)
      } catch (err) {
        Logger.error(`Error during logout API call:`, err)
      } finally {
        this.user = null
        this.accessToken = null
        this.expiresAt = null
        this.clearAuthStorage()
      }
    },

    // eslint-disable-next-line max-lines-per-function
    refreshAccessToken(): Promise<string | null> {
      if (this.activeRefreshPromise) {
        return this.activeRefreshPromise
      }

      this.activeRefreshPromise = (async (): Promise<string | null> => {
        try {
          const { data } = await simpleApiClient.post(
            ApiEndpoints.AUTH_INTERNAL_REFRESH,
            {}
          )

          const { internal_access_token, expires_in } = data

          if (!internal_access_token) {
            return null
          }

          this.setAuthData(internal_access_token, expires_in)

          return internal_access_token
        } catch (err) {
          Logger.error(`Token refresh failed:`, err)
          return null
        }
      })().finally(() => {
        this.activeRefreshPromise = null
      })

      return this.activeRefreshPromise
    },

    async getToken(): Promise<string | null> {
      if (!this.accessToken || !this.expiresAt) {
        return this.refreshAccessToken()
      }

      const expiresInMs = this.expiresAt - Date.now()

      if (expiresInMs > 60_000) {
        return this.accessToken
      }

      return this.refreshAccessToken()
    },

    isTokenValid(): boolean {
      if (!this.expiresAt) {
        return false
      }

      return Date.now() < this.expiresAt - 60_000
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
