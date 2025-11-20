<template>
  <div
    v-if="!isValidProject"
    class="min-h-screen flex items-center justify-center bg-gray-50"
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
      <button
        class="mt-8 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm"
        @click="router.push('/')"
      >
        Back to Projects
      </button>
    </div>
  </div>

  <KanbanBoard v-else />
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import KanbanBoard from '@/components/kanban/KanbanBoard.vue'
import { useTaskStore, useProjectStore } from '@/stores'
import { storeToRefs } from 'pinia'

const route = useRoute()
const router = useRouter()
const taskStore = useTaskStore()
const projectStore = useProjectStore()
const { projects } = storeToRefs(projectStore)

const currentProjectId = computed(() => route.params.id as string)
const isValidProject = computed(() => {
  if (!currentProjectId.value) {
    return false
  }
  return projects.value.some(p => p.id === currentProjectId.value)
})

const updateProject = (): void => {
  if (isValidProject.value) {
    taskStore.setCurrentProject(currentProjectId.value)
  } else {
    taskStore.clearCurrentProject()
  }
}

onMounted(updateProject)
watch(currentProjectId, updateProject)
onBeforeUnmount(() => taskStore.clearCurrentProject())
</script>
