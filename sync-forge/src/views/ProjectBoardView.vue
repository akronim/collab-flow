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
          <BaseButton @click="router.push({ name: RouteNames.PROJECTS })">
            Back to Projects
          </BaseButton>
        </div>
      </div>
    </header>

    <!-- TODO -->
    <!-- <div v-if="loading" class="flex justify-center items-center py-20">
      <p>Loading project...</p>
    </div> -->

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
import { useProjectStore } from '@/stores'
import BaseButton from '@/components/ui/base/BaseButton.vue'
import { RouteNames } from '@/constants/routes'
import type { Project } from '@/types/project'

const route = useRoute()
const router = useRouter()
const projectStore = useProjectStore()

const currentProjectId = computed(() => route.params.projectId as string)

const currentProject = computed((): Project | undefined => {
  if (!currentProjectId.value) {
    return undefined
  }
  return projectStore.fetchProjectById(currentProjectId.value)
})

const isValidProject = computed(() => !!currentProject.value)
</script>
