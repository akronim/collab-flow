<template>
    <div class="flex min-h-screen items-center justify-center bg-gray-50">
        <div class="text-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p class="mt-4 text-lg font-medium text-gray-700">Signing you in…</p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores'
import api from '@/utils/api'
import type { GoogleProfile } from '@/types/auth'
import axios from 'axios'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

onMounted(async () => {
    const code = route.query.code as string | undefined
    const codeVerifier = localStorage.getItem('code_verifier')

    if (!code || !codeVerifier) {
        router.replace('/login')
        return
    }

    try {
        const tokenResp = await api.post(
            `${BACKEND_URL}/api/auth/token`,
            { code, codeVerifier }
        )

        const { access_token, refresh_token, expires_in } = tokenResp.data

        if (!access_token || !refresh_token) {
          throw new Error('Missing tokens in auth response')
        }

        const profileResp = await api.get<GoogleProfile>(
            `${BACKEND_URL}/api/auth/validate`
        )

        authStore.setSession({
          user: profileResp.data,
          accessToken: access_token,
          refreshToken: refresh_token,
          expiresIn: expires_in,
          isGoogleLogin: true
        })

        router.replace('/')
    } catch (err) {
        if (axios.isAxiosError(err)) {
            console.error('Auth failed:', err.response?.data || err.message)
        } else {
            console.error('Auth failed:', err)
        }
        router.replace('/login')
    } finally {
        localStorage.removeItem('code_verifier')
    }
})
</script>