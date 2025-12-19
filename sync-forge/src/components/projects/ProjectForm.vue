<template>
  <form @submit.prevent="handleSubmit">
    <div class="space-y-4">
      <SfInput
        v-model="form.name"
        label="Project Name"
        name="name"
        required
      />
      <SfTextarea
        v-model="form.description"
        label="Description"
        name="description"
      />
    </div>
    <div class="mt-6 flex justify-end gap-2">
      <SfButton
        type="button"
        variant="secondary"
        @click="emit('cancel')"
      >
        Cancel
      </SfButton>
      <SfButton type="submit">
        Save
      </SfButton>
    </div>
  </form>
</template>

<script setup lang="ts">
import { reactive, onMounted } from 'vue'
import { SfButton, SfInput, SfTextarea } from '@/components/ui'
import type { Project, ProjectFormData } from '@/types/project'

interface Props {
  project?: Project | null
}

const props = withDefaults(defineProps<Props>(), {
  project: null
})

const emit = defineEmits([`submit`, `cancel`])

const form = reactive<ProjectFormData>({
  name: ``,
  description: ``
})

onMounted(() => {
  if (props.project) {
    form.name = props.project.name
    form.description = props.project.description
  }
})

const handleSubmit = (): void => {
  emit(`submit`, { ...form })
}
</script>
