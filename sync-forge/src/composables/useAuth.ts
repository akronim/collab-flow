import { useAuthStore } from '@/stores'
import api from '@/utils/api'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

export function useAuth() {
    const authStore = useAuthStore()

    const refreshAccessToken = async (): Promise<string | null> => {
        const refresh = localStorage.getItem('refresh_token')
        if (!refresh) return null

        try {
            const resp = await api.post(
                `${BACKEND_URL}/api/auth/refresh`,
                { refresh_token: refresh }
            )
            const { access_token, expires_in } = resp.data
            if (!access_token) return null

            const expiresAt = Date.now() + Number(expires_in) * 1000
            localStorage.setItem('access_token', access_token)
            localStorage.setItem('token_expires_at', String(expiresAt))
            return access_token
        } catch (err) {
            console.error('Refresh failed:', err)
            return null
        }
    }

    api.setRefreshTokenFn(refreshAccessToken)

    const getToken = async (): Promise<string | null> => {
        const token = localStorage.getItem('access_token')
        const expiresAt = localStorage.getItem('token_expires_at')

        if (!token || !expiresAt) {
            authStore.logout()
            return null
        }

        const expiresInMs = Number(expiresAt) - Date.now()
        if (expiresInMs > 60_000) return token

        const newToken = await refreshAccessToken()
        if (newToken) return newToken

        authStore.logout()
        return null
    }

    const isTokenValid = () => {
        const expiresAt = localStorage.getItem('token_expires_at')
        return expiresAt ? Date.now() < Number(expiresAt) - 60_000 : false
    }

    return { getToken, isTokenValid, refreshAccessToken }
}