<template>
  <div class="container mx-auto p-6">
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-3xl font-bold text-gray-900">
        Projects
      </h1>
    </div>

    <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <BaseCard
        v-for="project in projects"
        :key="project.id"
        hoverable
        clickable
        @click="openBoard(project.id)"
      >
        <template #header>
          <span class="text-lg font-semibold text-gray-800">
            {{ project.name }}
          </span>
        </template>

        <p class="text-sm text-gray-600">
          {{ project.description || 'No description' }}
        </p>

        <template #footer>
          <div class="flex items-center justify-between">
            <span class="text-xs text-gray-500">
              {{ project.taskCount }} tasks
            </span>
            <BaseButton
              variant="outline-blue"
              size="sm"
              @click.stop="openBoard(project.id)"
            >
              Open Board
              <LiExternalLink class="w-4 h-4" />
            </BaseButton>
          </div>
        </template>
      </BaseCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import BaseButton from '@/components/ui/base/BaseButton.vue'
import BaseCard from '@/components/ui/base/BaseCard.vue'
import { RouteNames } from '@/constants/routes'
import { useProjectStore } from '@/stores'
import { ExternalLink as LiExternalLink } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

const projectStore = useProjectStore()

const { projects } = storeToRefs(projectStore)
const router = useRouter()

onMounted(async () => {
  await projectStore.fetchProjects()
})

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
