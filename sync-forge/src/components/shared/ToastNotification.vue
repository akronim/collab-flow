<template>
  <transition
    enter-active-class="transition ease-out duration-300"
    enter-from-class="transform opacity-0 -translate-y-5"
    enter-to-class="transform opacity-100 translate-y-0"
    leave-active-class="transition ease-in duration-200"
    leave-from-class="transform opacity-100 translate-y-0"
    leave-to-class="transform opacity-0 -translate-y-5"
  >
    <div
      v-if="store.visible"
      class="fixed top-5 right-5 z-50 flex max-w-sm items-start space-x-4 rounded-md bg-white p-4 shadow-lg border-l-4"
      :class="styles.border"
      role="alert"
    >
      <component
        :is="styles.icon"
        class="h-6 w-6 flex-shrink-0"
        :class="styles.iconColor"
      />
      <div class="flex-grow">
        <p class="text-sm font-medium text-gray-900">
          {{ store.message }}
        </p>
      </div>
      <div class="flex-shrink-0">
        <button
          class="-m-1 flex rounded-md p-1 text-gray-500 hover:bg-gray-100 
          focus:outline-none focus:ring-2 focus:ring-gray-500 cursor-pointer"
          @click="store.hide"
        >
          <span class="sr-only">Dismiss</span>
          <X class="h-5 w-5" />
        </button>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { useNotificationStore, type NotificationType } from '@/stores/notification'
import { computed, type Component } from 'vue'
import { CheckCircle2, XCircle, Info, X } from 'lucide-vue-next'

const store = useNotificationStore()

const notificationStyles: Record<
  NotificationType,
  { border: string; icon: Component; iconColor: string }
> = {
  success: {
    border: `border-green-500`,
    icon: CheckCircle2,
    iconColor: `text-green-500`
  },
  error: {
    border: `border-red-500`,
    icon: XCircle,
    iconColor: `text-red-500`
  },
  info: {
    border: `border-blue-500`,
    icon: Info,
    iconColor: `text-blue-500`
  }
}

const styles = computed(() => notificationStyles[store.type])
</script>
