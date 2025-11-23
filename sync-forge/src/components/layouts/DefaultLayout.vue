<template>
  <div class="min-h-screen bg-gray-50">
    <header class="sticky top-0 z-10 bg-white shadow-sm border-b border-gray-200">
      <nav class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <div class="flex-shrink-0">
          <router-link
            to="/"
            class="text-xl font-bold text-gray-900"
          >
            CollabFlow
          </router-link>
        </div>
        <div
          v-if="authStore.isAuthenticated"
          class="flex items-center"
        >
          <button
            class="ml-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium
                   rounded-md shadow-sm text-white bg-red-600 cursor-pointer
                   hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            @click="handleLogout"
          >
            Logout
          </button>
        </div>
      </nav>
    </header>

    <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores'
import Logger from '@/utils/logger'

const router = useRouter()
const authStore = useAuthStore()

const handleLogout = async (): Promise<void> => {
  try {
    await authStore.logout()
  } catch (error) {
    Logger.error(`Logout failed:`, error)
  } finally {
    await router.push(`/login`)
  }
}
</script>
