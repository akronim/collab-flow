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
import { simpleApiClient } from '@/services/simpleApiClient'
import axios from 'axios'
import Logger from '@/utils/logger'
import { RouteNames } from '@/constants/routes'
import { ApiEndpoints } from '@/constants/apiEndpoints'

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
    const tokenResp = await simpleApiClient.post(ApiEndpoints.AUTH_TOKEN, { code, codeVerifier })

    const { internal_access_token, expires_in } = tokenResp.data

    if (!internal_access_token) {
      throw new Error(`Missing internal_access_token in auth response`)
    }

    authStore.setAuthData(internal_access_token, expires_in)

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
