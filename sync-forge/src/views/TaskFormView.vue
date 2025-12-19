<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">
        {{ isEditMode ? 'Edit Task' : 'New Task' }}
      </h1>
      <p class="text-gray-600 mt-1">
        {{ isEditMode ? 'Update task details' : 'Create a new task for your project' }}
      </p>
    </div>

    <!-- Error Alert -->
    <div
      v-if="error"
      class="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded"
    >
      {{ error }}
    </div>

    <div
      v-if="isLoading"
      class="bg-white rounded-lg shadow p-6 text-center"
    >
      <p>Loading task...</p>
    </div>

    <TaskForm
      v-else
      v-model="form"
      :is-edit-mode="isEditMode"
      :is-loading="isLoading"
      :title-exists="titleExists"
      @submit="saveTask"
      @cancel="cancel"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useTaskForm } from '@/composables/useTaskForm'
import type { TaskStatus } from '@/types/task'
import TaskForm from '@/components/tasks/TaskForm.vue'

const route = useRoute()

const projectId = computed(() => route.params.projectId as string)
const taskId = computed(() => route.params.taskId as string | undefined)
const status = computed(() => route.query.status as TaskStatus | undefined)

const {
  form,
  isLoading,
  error,
  isEditMode,
  titleExists,
  loadTask,
  saveTask,
  cancel
} = useTaskForm({
  projectId,
  taskId,
  status,
  onSuccess: () => {
    // TODO show a toast notification here
  },
  onError: (_err) => {
    // TODO show an error toast here
  }
})

onMounted(async () => {
  await loadTask()
})
</script>
