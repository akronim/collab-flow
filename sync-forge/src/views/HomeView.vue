<template>
  <div class="container mx-auto p-6">
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-3xl font-bold text-gray-900">
        Projects
      </h1>
      <button
        class="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 cursor-pointer"
        @click="handleLogout"
      >
        Logout
      </button>
    </div>

    <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="project in projects"
        :key="project.id"
        class="rounded-lg border bg-white p-5 shadow-sm transition hover:shadow"
      >
        <h3 class="text-lg font-semibold text-gray-800">
          {{ project.name }}
        </h3>
        <p class="mt-1 text-sm text-gray-600">
          {{ project.description }}
        </p>
        <p class="mt-3 text-xs text-gray-500">
          {{ tasks.filter((t) => t.projectId === project.id).length }} tasks
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore, useProjectStore, useTaskStore } from '@/stores'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'

const router = useRouter()
const authStore = useAuthStore()
const { projects } = storeToRefs(useProjectStore())
const { tasks } = storeToRefs(useTaskStore())

const handleLogout = async (): Promise<void> => {
  await authStore.logout()
  await router.push(`/login`)
}
</script>
