<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center"
  >
    <!-- Backdrop -->
    <div
      class="absolute inset-0 bg-black/50"
      @click="emit('close')"
    />

    <!-- Modal -->
    <div class="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 p-6">
      <h2 class="text-xl font-semibold mb-4">
        {{ task ? 'Edit Task' : 'New Task' }}
      </h2>

      <form @submit.prevent="handleSubmit">
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1">Title</label>
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
          <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            v-model="form.description"
            rows="4"
            class="w-full px-3 py-2 border border-gray-300 rounded-md 
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Add description (optional)"
          />
        </div>

        <div class="flex justify-end gap-3">
          <BaseButton
            variant="outline"
            @click="onCancel"
          >
            Cancel
          </BaseButton>
          <BaseButton
            type="submit"
            variant="primary"
          >
            {{ task ? 'Update' : 'Create' }} Task
          </BaseButton>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Task } from '@/types/task'
import BaseButton from '@/components/ui/base/BaseButton.vue'

interface Props {
  task?: Task | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  save: [data: { title: string; description: string }]
}>()

const form = ref({
  title: props.task?.title ?? ``,
  description: props.task?.description ?? ``
})

const resetForm = (): void => {
  form.value.title = ``
  form.value.description = ``
}

const onCancel = (): void => {
  resetForm()
  emit(`close`)
}

const handleSubmit = (): void => {
  if (!form.value.title.trim()) {
    return
  }

  emit(`save`, {
    title: form.value.title.trim(),
    description: form.value.description.trim()
  })

  resetForm()

  emit(`close`)
}
</script>
