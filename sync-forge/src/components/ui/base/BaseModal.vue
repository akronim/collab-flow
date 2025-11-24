<template>
  <div
    class="fixed inset-0 z-50 flex justify-center"
    :class="{
      'items-center': position === 'center',
      'items-start pt-20': position === 'top'
    }"
    @keydown.esc="emit('close')"
  >
    <!-- Backdrop -->
    <div
      class="absolute inset-0 bg-gray-900/60"
      @click="emit('close')"
    />

    <!-- Modal -->
    <div
      class="relative flex flex-col bg-white rounded-lg shadow-xl w-full max-w-lg mx-4"
      style="max-height: calc(100vh - 4rem);"
    >
      <header
        v-if="$slots.header || title"
        class="px-4 py-3 border-b border-gray-200 flex-shrink-0 relative"
      >
        <slot name="header">
          <h2 class="text-lg font-semibold text-gray-800">
            {{ title }}
          </h2>
        </slot>
        <BaseButton
          variant="ghost"
          size="sm"
          class="absolute top-2 right-2"
          aria-label="Close modal"
          @click="emit('close')"
        >
          <XIcon class="h-5 w-5" />
        </BaseButton>
      </header>

      <main class="p-6 overflow-y-auto">
        <slot />
      </main>

      <footer
        v-if="$slots.footer"
        class="px-6 py-4 bg-gray-50 border-t border-gray-200 text-right rounded-b-lg flex-shrink-0"
      >
        <slot name="footer" />
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { X as XIcon } from 'lucide-vue-next'
import BaseButton from '@/components/ui/base/BaseButton.vue'

interface Props {
  title?: string
  position?: `center` | `top`
}

withDefaults(defineProps<Props>(), {
  title: ``,
  position: `center`
})

const emit = defineEmits<{
  close: []
}>()

const handleKeydown = (e: KeyboardEvent): void => {
  if (e.key === `Escape`) {
    emit(`close`)
  }
}

onMounted(() => {
  document.addEventListener(`keydown`, handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener(`keydown`, handleKeydown)
})
</script>
