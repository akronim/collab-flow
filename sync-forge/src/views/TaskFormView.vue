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

    <form
      v-else
      class="bg-white rounded-lg shadow p-6"
      @submit.prevent="saveTask"
    >
      <SfInput
        v-model="form.title"
        label="Title"
        required
        placeholder="Enter task title"
        class="mb-4"
      />

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
        <SfButton
          variant="outline"
          type="button"
          @click="cancel"
        >
          Cancel
        </SfButton>
        <SfButton
          type="submit"
          variant="primary"
          :disabled="isLoading || !titleExists"
        >
          {{ isEditMode ? 'Update' : 'Create' }} Task
        </SfButton>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useTaskForm } from '@/composables/useTaskForm'
import type { TaskStatus } from '@/types/task'
import { SfButton, SfInput } from '@/components/ui'

const JoditEditor = defineAsyncComponent(
  () => import(`@/components/editors/jodit/JoditEditor.vue`)
)

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
