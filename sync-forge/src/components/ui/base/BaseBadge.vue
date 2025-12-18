<template>
  <span :class="badgeClasses">
    <slot />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  variant?: `gray` | `blue` | `green` | `yellow` | `red`
}

const props = withDefaults(defineProps<Props>(), {
  variant: `gray`
})

const badgeClasses = computed(() => {
  const baseClasses = `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium`
  switch (props.variant) {
    case `blue`:
      return `${baseClasses} bg-blue-50 text-blue-700 border border-blue-200`
    case `green`:
      return `${baseClasses} bg-green-50 text-green-700 border border-green-200`
    case `yellow`:
      return `${baseClasses} bg-yellow-50 text-yellow-700 border border-yellow-200`
    case `red`:
      return `${baseClasses} bg-red-50 text-red-700 border border-red-200`
    case `gray`:
    default:
      return `${baseClasses} bg-gray-50 text-gray-700 border border-gray-200`
  }
})
</script>
