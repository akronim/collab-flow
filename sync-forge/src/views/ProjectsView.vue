<template>
  <div class="container mx-auto p-6">
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-3xl font-bold text-gray-900">
        Projects
      </h1>
    </div>

    <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="project in projects"
        :key="project.id"
        class="group relative rounded-lg border bg-white p-5 
                shadow-sm transition-all hover:shadow-lg hover:border-blue-300"
      >
        <h3 class="text-lg font-semibold text-gray-800">
          {{ project.name }}
        </h3>
        <p class="mt-1 text-sm text-gray-600 line-clamp-2">
          {{ project.description || 'No description' }}
        </p>
        <p class="mt-3 text-xs text-gray-500">
          {{ taskStore.taskCountByProjectId(project.id) }} tasks
        </p>

        <div class="mt-4 flex items-center justify-end">
          <BaseButton
            variant="outline-blue"
            size="sm"
            title="Open Board"
            aria-label="Open Board"
            @click="() => openBoard(project.id)"
          >
            Open Board
            <LiExternalLink class="w-4 h-4" />
          </BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import BaseButton from '@/components/ui/base/BaseButton.vue'
import { RouteNames } from '@/constants/routes'
import { useProjectStore, useTaskStore } from '@/stores'
import { ExternalLink as LiExternalLink } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'

const { projects } = storeToRefs(useProjectStore())
const taskStore = useTaskStore()
const router = useRouter()

const openBoard = async (projectId: string): Promise<void> => {
  await router.push({
    name: RouteNames.PROJECT_BOARD,
    params: {
      projectId: projectId 
    }
  })
}
</script>

<style scoped>
.line-clamp-2 {
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  line-clamp: 2;
  -webkit-line-clamp: 2;
}
</style>
