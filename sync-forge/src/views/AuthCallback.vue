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
import { authApiService } from '@/services/authService'
import Logger from '@/utils/logger'
import { RouteNames } from '@/constants/routes'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

onMounted(async () => {
  Logger.log(`[AuthCallback.vue onMounted]`)

  const code = route.query.code as string | undefined
  const codeVerifier = authStore.getPkceCodeVerifier()

  if (!code || !codeVerifier) {
    await router.replace({ name: RouteNames.LOGIN })
    return
  }

  try {
    const result = await authApiService.exchangeToken(code, codeVerifier)

    if (result.isSuccess()) {
      await authStore.fetchUser()
      await router.replace(`/`)
    } else {
      Logger.error(`Auth failed:`, result.error)
      await router.replace({ name: RouteNames.LOGIN })
    }
  } catch (err) {
    // This catch block is for unexpected errors in the service call itself
    Logger.error(`An unexpected error occurred during token exchange:`, err)
    await router.replace({ name: RouteNames.LOGIN })
  } finally {
    authStore.clearPkceCodeVerifier()
  }
})
</script>
