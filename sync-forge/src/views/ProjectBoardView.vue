<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
    <header class="bg-white shadow-sm border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">
            {{ currentProject?.name }}
          </h1>
          <p class="text-sm text-gray-600 mt-1">
            {{ currentProject?.description }}
          </p>
        </div>
        <div class="flex items-center gap-4">
          <BaseButton @click="router.push('/projects')">
            Back to Projects
          </BaseButton>
        </div>
      </div>
    </header>

    <div
      v-if="!isValidProject"
      class="flex items-center justify-center bg-gray-50"
    >
      <div class="text-center">
        <h1 class="text-6xl font-bold text-gray-300">
          404
        </h1>
        <p class="text-xl text-gray-600 mt-4">
          Project not found
        </p>
        <p class="text-gray-500 mt-2">
          This project doesn't exist or has been deleted.
        </p>
      </div>
    </div>

    <KanbanBoard v-else />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import KanbanBoard from '@/components/kanban/KanbanBoard.vue'
import { useProjectStore, type Project } from '@/stores'
import { storeToRefs } from 'pinia'
import BaseButton from '@/components/ui/base/BaseButton.vue'

const route = useRoute()
const router = useRouter()
const projectStore = useProjectStore()
const { projects } = storeToRefs(projectStore)

const currentProjectId = computed(() => route.params.id as string)

const isValidProject = computed(() => {
  if (!currentProjectId.value) {
    return false
  }
  return projects.value.some(p => p.id === currentProjectId.value)
})

const currentProject = computed((): Project | undefined => {
  if (!isValidProject.value) {
    return undefined
  }
  return projects.value.find(p => p.id === currentProjectId.value)
})
</script>
