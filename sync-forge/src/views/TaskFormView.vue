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

    <SfLoadingState
      v-if="isLoading"
      message="Loading task..."
    />

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
import SfLoadingState from '@/components/ui/SfLoadingState.vue'

const route = useRoute()

const projectId = computed(() => route.params.projectId as string)
const taskId = computed(() => route.params.taskId as string | undefined)
const status = computed(() => route.query.status as TaskStatus | undefined)

const {
  form,
  isLoading,
  isEditMode,
  titleExists,
  loadTask,
  saveTask,
  cancel
} = useTaskForm({
  projectId,
  taskId,
  status
})

onMounted(async () => {
  await loadTask()
})
</script>
