<script setup lang="ts">
import Logger from '@/utils/logger'
import { generateCodeVerifier, generateCodeChallenge } from '@/utils/pkce'

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
const redirectUri = `${window.location.origin}/auth/callback`

const login = async (): Promise<void> => {
  try {
    const codeVerifier = generateCodeVerifier()
    localStorage.setItem(`code_verifier`, codeVerifier)

    const codeChallenge = await generateCodeChallenge(codeVerifier)

    const authUrl = new URL(`https://accounts.google.com/o/oauth2/v2/auth`)
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

<template>
  <div class="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-100">
    <div class="w-full max-w-sm rounded-xl bg-white p-8 shadow-lg">
      <h1 class="mb-6 text-center text-2xl font-bold text-gray-900">
        CollabFlow
      </h1>
      <button
        class="flex w-full items-center justify-center gap-3 rounded-lg bg-white px-4 py-3 text-gray-700 shadow-sm ring-1 ring-gray-300 transition hover:shadow-md cursor-pointer"
        @click="login"
      >
        <img
          src="https://www.google.com/favicon.ico"
          alt=""
          class="h-5 w-5"
        >
        Sign in with Google
      </button>
    </div>
  </div>
</template>
