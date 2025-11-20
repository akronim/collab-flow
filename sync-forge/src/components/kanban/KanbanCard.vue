<template>
  <div
    class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 
            cursor-move hover:shadow-md transition-shadow select-none"
    draggable="true"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
  >
    <h4 class="font-medium text-gray-900 mb-2">
      {{ task.title }}
    </h4>
    <p class="text-sm text-gray-600 line-clamp-2">
      {{ task.description || 'No description' }}
    </p>

    <div class="mt-4 flex items-center justify-between text-xs">
      <span class="text-gray-500">
        {{ formattedDate }}
      </span>

      <div class="flex gap-2">
        <button
          class="text-gray-500 hover:text-blue-600 transition p-1"
          title="Edit task"
          aria-label="Edit task"
          @click.stop="emit('edit')"
        >
          <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
        </button>
        <button
          class="text-gray-500 hover:text-red-600 transition p-1"
          title="Delete task"
          aria-label="Delete task"
          @click.stop="emit('delete')"
        >
          <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 7l-.867 12.142A2.138 2.138 0 0116.138 21H7.862a2.138 2.138 0 011.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatToLocalDayMonthYearTime } from '@/utils/date'
import type { Task } from '@/types/task'

interface Props {
  task: Task
}

const props = defineProps<Props>()
const emit = defineEmits<{
  edit: []
  delete: []
}>()

// change this later to come from auth/user store
const USER_TIMEZONE = `Europe/Zagreb`

const formattedDate = computed((): string => {
  const formatted = formatToLocalDayMonthYearTime(
    props.task.updatedAt,
    USER_TIMEZONE,
    false,
    true
  )

  return formatted ?? `Just now`
})

const handleDragStart = (e: DragEvent): void => {
  if (e.dataTransfer) {
    const el = e.currentTarget as HTMLElement
    el.classList.add(`opacity-40`, `rotate-3`, `scale-95`)
    e.dataTransfer.setData(`taskId`, props.task.id)
    e.dataTransfer.effectAllowed = `move`
  }
}

const handleDragEnd = (e: DragEvent): void => {
  const el = e.currentTarget as HTMLElement
  el.classList.remove(`opacity-40`, `rotate-3`, `scale-95`)
}
</script>

<style scoped>
.line-clamp-2 {
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
</style>
