<template>
  <button
    :type="type"
    :class="[
      buttonClasses,
      { 'cursor-pointer': !disabled }
    ]"
    :disabled="disabled || loading"
    v-bind="$attrs"
    @click="onClick"
  >
    <span
      v-if="loading"
      class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type ButtonVariant = `primary` | `secondary` | `danger` | `ghost` | `outline`
type ButtonSize = `sm` | `md` | `lg`

interface Props {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  disabled?: boolean
  fullWidth?: boolean
  type?: `button` | `submit` | `reset`
}

const props = withDefaults(defineProps<Props>(), {
  variant: `primary`,
  size: `md`,
  type: `button`,
  loading: false,
  disabled: false,
  fullWidth: false
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const baseClasses = `inline-flex items-center justify-center font-semibold rounded transition-colors 
                    focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed`

const variantClasses: Record<ButtonVariant, string> = {
  primary: `bg-green-600 text-white hover:bg-green-700 active:bg-green-800 border border-green-700`,
  secondary: `bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300 border border-gray-300`,
  danger: `bg-red-600 text-white hover:bg-red-700 active:bg-red-800 border border-red-700`,
  ghost: `bg-transparent text-gray-900 hover:bg-gray-100 active:bg-gray-200 border border-transparent`,
  outline: `bg-white text-gray-900 border border-gray-300 hover:bg-gray-50`
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: `px-3 py-1 text-xs gap-1`,
  md: `px-4 py-1.5 text-sm gap-1.5`,
  lg: `px-5 py-2 text-base gap-2`
}

const buttonClasses = computed(() => {
  return [
    baseClasses,
    variantClasses[props.variant],
    sizeClasses[props.size],
    props.fullWidth ? `w-full` : ``
  ].join(` `)
})

const onClick = (e: MouseEvent): void => {
  if (props.disabled || props.loading) {
    e.preventDefault()
    return
  }
  emit(`click`, e)
}
</script>
