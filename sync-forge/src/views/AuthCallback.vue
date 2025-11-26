<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-50">
    <div class="text-center">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto" />
      <p class="mt-4 text-lg font-medium text-gray-700">
        Signing you in…
      </p>
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
import Logger from '@/utils/logger'
import { RouteNames } from '@/constants/routes'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

onMounted(async () => {
  const code = route.query.code as string | undefined
  const codeVerifier = authStore.getPkceCodeVerifier()

  if (!code || !codeVerifier) {
    await router.replace({ name: RouteNames.LOGIN })
    return
  }

  try {
    const tokenResp = await api.post(`/api/auth/token`, { code, codeVerifier })

    const { access_token, refresh_token, expires_in } = tokenResp.data

    if (!access_token || !refresh_token) {
      throw new Error(`Missing tokens in auth response`)
    }

    authStore.setAuthTokens({
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresIn: expires_in,
      isGoogleLogin: true
    })

    const profileResp = await api.get<GoogleProfile>(`/api/auth/validate`)

    authStore.setUser({ user: profileResp.data })

    await router.replace(`/`)
  } catch (err) {
    if (axios.isAxiosError(err)) {
      Logger.error(`Auth failed:`, err.response?.data ?? err.message)
    } else {
      Logger.error(`Auth failed:`, err)
    }
    await router.replace({ name: RouteNames.LOGIN })
  } finally {
    authStore.clearPkceCodeVerifier()
  }
})
</script>
