<template>
  <div 
    v-bind="$attrs"
    :class="[
      'bg-white rounded-lg border border-gray-200 shadow-sm',
      hoverable && 'hover:shadow-md hover:border-gray-300 transition-all',
      clickable && 'cursor-pointer',
      className
    ]"
    @click="handleClick"
  >
    <div
      v-if="$slots.header"
      class="px-4 py-2 border-b border-gray-100"
    >
      <slot name="header" />
    </div>

    <div :class="['px-4 py-2', { 'pt-4': !$slots.header }]">
      <slot />
    </div>

    <div 
      v-if="$slots.footer"
      class="px-4 py-2 bg-gray-50/50 border-t border-gray-100 rounded-b-lg"
    >
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  hoverable?: boolean
  clickable?: boolean
  className?: string
}

withDefaults(defineProps<Props>(), {
  hoverable: false,
  clickable: false,
  className: ``
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const handleClick = (event: MouseEvent): void => {
  emit(`click`, event)
}
</script>
