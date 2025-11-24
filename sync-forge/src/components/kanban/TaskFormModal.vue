<template>
  <BaseModal
    :title="task ? 'Edit Task' : 'New Task'"
    position="top"
    @close="onCancel"
  >
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
        <JoditEditor
          v-model:editor-model="form.description"
          :config="{
            placeholder: 'Add description (optional)'
          }"
        />
      </div>
    </form>
    <template #footer>
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
          @click="handleSubmit"
        >
          {{ task ? 'Update' : 'Create' }} Task
        </BaseButton>
      </div>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { defineAsyncComponent, ref } from 'vue'
import type { Task } from '@/types/task'
import BaseButton from '@/components/ui/base/BaseButton.vue'
import BaseModal from '@/components/ui/base/BaseModal.vue'

const JoditEditor = defineAsyncComponent(
  () => import(`@/components/shared/editors/jodit/JoditEditor.vue`)
)

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
