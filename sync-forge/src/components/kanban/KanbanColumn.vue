<template>
  <div
    class="flex-shrink-0 w-80 bg-gray-100 rounded-lg p-4 flex flex-col"
    @dragover.prevent
    @dragenter.prevent
    @drop="handleDrop"
  >
    <div class="flex items-center justify-between mb-4">
      <h3 class="font-semibold text-gray-700 uppercase tracking-wider text-xs">
        {{ title }}
      </h3>
      <span class="bg-gray-300 text-gray-700 text-xs px-2 py-1 rounded-full">
        {{ tasks.length }}
      </span>
    </div>

    <button
      class="mb-4 text-gray-500 hover:text-gray-700 text-sm flex items-center gap-2 
            hover:bg-gray-200 rounded px-2 py-1 transition"
      @click="emit('add-task')"
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
          d="M12 4v16m8-8H4"
        />
      </svg>
      Add task
    </button>

    <div
      ref="dropZone"
      class="flex-1 space-y-3 min-h-[100px]"
      :class="{ 'bg-gray-200/50 border-2 border-dashed border-gray-400 rounded': isDraggingOver }"
    >
      <KanbanCard
        v-for="task in tasks"
        :key="task.id"
        :task="task"
        @edit="emit('edit-task', task)"
        @delete="emit('delete-task', task.id)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import KanbanCard from './KanbanCard.vue'
import type { Task, TaskStatus } from '@/types/task'

interface Props {
  title: string
  status: TaskStatus
  tasks: Task[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'add-task': []
  'move-task': [taskId: string, newStatus: TaskStatus]
  'edit-task': [task: Task]
  'delete-task': [taskId: string]
}>()

const isDraggingOver = ref(false)

const handleDrop = (e: DragEvent): void => {
  e.preventDefault()
  isDraggingOver.value = false

  const taskId = e.dataTransfer?.getData(`taskId`)
  if (taskId && taskId !== ``) {
    emit(`move-task`, taskId, props.status)
  }
}

const dropZone = ref<HTMLElement | null>(null)

defineExpose({ dropZone })
</script>
