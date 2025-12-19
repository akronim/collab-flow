<template>
  <div class="w-full">
    <label
      v-if="label"
      :for="textareaId"
      class="block text-sm font-medium text-gray-700 mb-1"
    >
      {{ label }}
      <span
        v-if="required"
        class="text-red-500"
      >*</span>
    </label>
    <textarea
      :id="textareaId"
      ref="textareaRef"
      v-model="model"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
      :rows="rows"
      :class="[
        `w-full px-3 py-1.5 text-sm bg-white border rounded-md`,
        `transition-colors duration-150`,
        `placeholder:text-gray-400`,
        disabled
          ? `bg-gray-50 text-gray-500 cursor-not-allowed border-gray-200`
          : error
            ? `border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500`
            : `border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500`,
        `focus:outline-none`
      ]"
      @blur="emit(`blur`, $event)"
      @focus="emit(`focus`, $event)"
    />
    <p
      v-if="error && errorMessage"
      class="mt-1 text-sm text-red-600"
    >
      {{ errorMessage }}
    </p>
    <p
      v-else-if="hint"
      class="mt-1 text-sm text-gray-500"
    >
      {{ hint }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

interface Props {
  placeholder?: string
  label?: string
  disabled?: boolean
  required?: boolean
  error?: boolean
  errorMessage?: string
  hint?: string
  id?: string
  rows?: number
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: ``,
  label: ``,
  disabled: false,
  required: false,
  error: false,
  errorMessage: ``,
  hint: ``,
  id: ``,
  rows: 4
})

const model = defineModel<string>({ default: `` })

const emit = defineEmits<{
  blur: [event: FocusEvent]
  focus: [event: FocusEvent]
}>()

const textareaRef = ref<HTMLTextAreaElement | null>(null)

const textareaId = computed(() => props.id || `textarea-${Math.random().toString(36).slice(2, 9)}`)

const focus = (): void => {
  textareaRef.value?.focus()
}

const blur = (): void => {
  textareaRef.value?.blur()
}

defineExpose({ focus, blur, textareaRef })
</script>
