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
    <!-- eslint-disable vue/no-v-html -->
    <p
      class="text-sm text-gray-600 line-clamp-2"
      v-html="sanitizedDescription"
    />
    <!-- eslint-enable vue/no-v-html -->

    <div class="mt-4 flex items-center justify-between text-xs">
      <span class="text-gray-500">
        {{ formattedDate }}
      </span>

      <div class="flex gap-2">
        <BaseButton
          variant="ghost"
          size="sm"
          title="Edit task"
          aria-label="Edit task"
          @click.stop="emit('edit')"
        >
          <LiSquarePen class="w-4 h-4" />
        </BaseButton>

        <BaseButton
          variant="ghost"
          size="sm"
          title="Delete task"
          aria-label="Delete task"
          @click.stop="emit('delete')"
        >
          <LiTrash2 class="w-4 h-4" />
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatToLocalDayMonthYearTime } from '@/utils/date'
import type { Task } from '@/types/task'
import { SquarePen as LiSquarePen, Trash2 as LiTrash2 } from 'lucide-vue-next'
import BaseButton from '@/components/ui/base/BaseButton.vue'
import { sanitizeHtml } from '@/utils/sanitize'

interface Props {
  task: Task
}

const props = defineProps<Props>()
const emit = defineEmits<{
  edit: []
  delete: []
}>()

const sanitizedDescription = computed(() => {
  if (props.task.description) {
    return sanitizeHtml(props.task.description)
  }
  return `No description`
})

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
  line-clamp: 2;
  -webkit-line-clamp: 2;
}
</style>
