<template>
  <div class="max-w-3xl mx-auto py-8 px-4">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">
        {{ isEditMode ? 'Edit Task' : 'New Task' }}
      </h1>
      <p class="text-gray-600 mt-1">
        {{ isEditMode ? 'Update task details' : 'Create a new task for your project' }}
      </p>
    </div>

    <div
      v-if="isLoading"
      class="bg-white rounded-lg shadow p-6 text-center"
    >
      <p>Loading task...</p>
    </div>

    <form
      v-else
      class="bg-white rounded-lg shadow p-6"
      @submit.prevent="handleSubmit"
    >
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Title <span class="text-red-500">*</span>
        </label>
        <input
          v-model="form.title"
          type="text"
          required
          class="w-full px-3 py-2 border border-gray-300 rounded-md 
                focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter task title"
        >
      </div>

      <div class="mb-6">
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <JoditEditor
          v-model:editor-model="form.description"
          :config="{
            placeholder: 'Add description (optional)'
          }"
        />
      </div>

      <div class="flex justify-end gap-3">
        <BaseButton
          variant="outline"
          type="button"
          @click="handleCancel"
        >
          Cancel
        </BaseButton>
        <BaseButton
          type="submit"
          variant="primary"
          :disabled="isLoading"
        >
          {{ isEditMode ? 'Update' : 'Create' }} Task
        </BaseButton>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent, ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useTaskStore } from '@/stores'
import type { TaskStatus } from '@/types/task'
import BaseButton from '@/components/ui/base/BaseButton.vue'
import Logger from '@/utils/logger'
import { RouteNames } from '@/constants/routes'

const JoditEditor = defineAsyncComponent(
  () => import(`@/components/shared/editors/jodit/JoditEditor.vue`)
)

const router = useRouter()
const route = useRoute()
const taskStore = useTaskStore()

const projectId = computed(() => route.params.id as string)
const taskId = computed(() => route.params.taskId as string | undefined)
const status = computed(() => route.query.status as TaskStatus | undefined)
const isEditMode = computed(() => !!taskId.value)

const form = ref({
  title: ``,
  description: ``
})
const isLoading = ref(false)

onMounted(async () => {
  if (isEditMode.value && taskId.value) {
    isLoading.value = true
    const task = taskStore.getTaskById(projectId.value, taskId.value)
    if (task) {
      form.value.title = task.title
      form.value.description = task.description ?? ``
    } else {
      Logger.error(`Task not found: ${taskId.value}`)
      await router.push({ name: RouteNames.PROJECT_BOARD, params: { id: projectId.value } })
    }
    isLoading.value = false
  }
})

const handleSubmit = async (): Promise<void> => {
  if (!form.value.title.trim()) {
    return
  }

  if (!projectId.value) {
    Logger.error(`No current project set`)
    return
  }

  if (isEditMode.value && taskId.value) {
    taskStore.updateTask(taskId.value, {
      title: form.value.title.trim(),
      description: form.value.description.trim()
    })
  } else {
    const targetStatus = status.value ?? `todo`
    taskStore.addTask({
      projectId: projectId.value,
      title: form.value.title.trim(),
      description: form.value.description.trim(),
      status: targetStatus,
      order: taskStore.tasksByStatus(projectId.value, targetStatus).length
    })
  }

  await router.push({ name: RouteNames.PROJECT_BOARD, params: { id: projectId.value } })
}

const handleCancel = async (): Promise<void> => {
  await router.push({ name: RouteNames.PROJECT_BOARD, params: { id: projectId.value } })
}
</script>
