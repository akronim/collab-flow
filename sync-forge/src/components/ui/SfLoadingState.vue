<template>
  <div class="flex items-center justify-center py-20 text-sm text-gray-600">
    <slot>{{ message }}</slot>
  </div>
</template>

<script setup lang="ts">
interface Props {
  message?: string
}

withDefaults(defineProps<Props>(), {
  message: `Loading...`
})
</script>
