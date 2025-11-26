<template>
  <div class="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-100">
    <div class="w-full max-w-sm rounded-xl bg-white p-8 shadow-lg">
      <h1 class="mb-6 text-center text-2xl font-bold text-gray-900">
        CollabFlow
      </h1>
      <BaseButton
        variant="outline"
        size="lg"
        full-width
        @click="login"
      >
        <img
          :src="googleOAuthEndpoints.FAVICON_URL"
          alt=""
          class="h-5 w-5"
        >
        Sign in with Google
      </BaseButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import BaseButton from '@/components/ui/base/BaseButton.vue'
import { AppRoutes } from '@/constants/routes'
import Logger from '@/utils/logger'
import { generateCodeChallenge, generateCodeVerifier } from '@/utils/pkce'
import { useAuthStore } from '@/stores'
import { googleOAuthEndpoints } from '@/constants/apiEndpoints'

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
const redirectUri = `${window.location.origin}${AppRoutes.AUTH_CALLBACK}`
const authStore = useAuthStore()

const login = async (): Promise<void> => {
  try {
    const codeVerifier = generateCodeVerifier()
    authStore.setPkceCodeVerifier(codeVerifier)

    const codeChallenge = await generateCodeChallenge(codeVerifier)

    const authUrl = new URL(googleOAuthEndpoints.AUTH_URL)
    authUrl.searchParams.append(`client_id`, clientId)
    authUrl.searchParams.append(`redirect_uri`, redirectUri)
    authUrl.searchParams.append(`response_type`, `code`)
    authUrl.searchParams.append(`scope`, `openid email profile`)
    authUrl.searchParams.append(`code_challenge`, codeChallenge)
    authUrl.searchParams.append(`code_challenge_method`, `S256`)

    authUrl.searchParams.append(`access_type`, `offline`)
    authUrl.searchParams.append(`prompt`, `consent`)

    window.location.assign(authUrl.toString())
  } catch (err) {
    Logger.error(`Login failed:`, err)
  }
}
</script>
