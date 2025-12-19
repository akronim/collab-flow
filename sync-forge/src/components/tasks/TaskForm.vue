<template>
  <form
    class="bg-white rounded-lg shadow p-6"
    @submit.prevent="emit('submit')"
  >
    <SfInput
      v-model="model.title"
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
        v-model:editor-model="model.description"
        :config="{
          placeholder: 'Add description (optional)'
        }"
      />
    </div>

    <div class="flex justify-end gap-3">
      <SfButton
        variant="outline"
        type="button"
        @click="emit('cancel')"
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
</template>

<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import { SfButton, SfInput } from '@/components/ui'
import type { TaskFormData } from '@/types/task'

const JoditEditor = defineAsyncComponent(
  () => import(`@/components/editors/jodit/JoditEditor.vue`)
)

defineProps<{
  isEditMode: boolean
  isLoading: boolean
  titleExists: boolean
}>()

const model = defineModel<TaskFormData>({ required: true })

const emit = defineEmits([`submit`, `cancel`])
</script>
