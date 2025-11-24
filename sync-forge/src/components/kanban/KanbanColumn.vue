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

    <BaseButton
      variant="secondary"
      size="sm"
      class="mb-4"
      @click="emit('add-task')"
    >
      <LiPlus class="w-4 h-4" />
      Add task
    </BaseButton>

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
import { Plus as LiPlus } from 'lucide-vue-next'
import BaseButton from '@/components/ui/base/BaseButton.vue'

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
