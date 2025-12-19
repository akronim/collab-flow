<template>
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

      <div class="md:flex items-center space-x-8">
        <router-link
          to="/"
          class="text-gray-700 hover:text-gray-900 font-medium"
        >
          Home
        </router-link>
        <router-link
          to="/projects"
          class="text-gray-700 hover:text-gray-900 font-medium"
        >
          Projects
        </router-link>
      </div>

      <div
        v-if="authStore.isAuthenticated"
        class="flex items-center gap-2"
      >
        <span
          v-if="authStore.user"
          class="text-sm font-medium text-gray-700"
        >
          {{ authStore.user.name }}
        </span>
        <span class="text-sm text-gray-500">Europe/Zagreb</span>
        <SfButton
          variant="danger"
          :data-test-id="LayoutTestId.BtnLogout"
          @click="handleLogout"
        >
          Logout
        </SfButton>
      </div>
    </nav>
  </header>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores'
import Logger from '@/utils/logger'
import { SfButton } from '@/components/ui'
import { LayoutTestId } from '@/constants/htmlCodes'
import { RouteNames } from '@/constants/routes'

const router = useRouter()
const authStore = useAuthStore()

const handleLogout = async (): Promise<void> => {
  try {
    await authStore.logout()
  } catch (error) {
    Logger.error(`Logout failed:`, error)
  } finally {
    void router.push({ name: RouteNames.LOGIN })
  }
}
</script>
