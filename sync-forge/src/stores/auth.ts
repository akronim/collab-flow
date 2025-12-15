import { defineStore } from 'pinia'
import type { User } from '@/types/auth'
import { authApiService } from '@/services/authService'
import Logger from '@/utils/logger'
import { CODE_VERIFIER_KEY } from '@/constants/localStorageKeys'

interface AuthState {
  user: User | null
}

export const useAuthStore = defineStore(`auth`, {
  state: (): AuthState => ({
    user: null
  }),

  getters: {
    isAuthenticated: (state) => !!state.user
  },

  actions: {
    async fetchUser() {
      if (this.user) {
        return
      }
      
      const result = await authApiService.getUser()

      if (result.isSuccess()) {
        this.user = result.data
        Logger.log({ user: this.user })
      } else {
        this.user = null
        Logger.log(`[AUTH STORE] fetchUser ERROR`)
      }
    },

    async logout() {
      try {
        await authApiService.logout()
      } finally {
        this.user = null
        window.location.href = `/login` // Force redirect after logout
      }
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
