<template>
  <div
    v-if="taskStore.tasksForCurrentProject(currentProjectId).length === 0"
    class="w-full text-center py-20"
  >
    <p class="text-gray-500 text-lg">
      No tasks yet in this project
    </p>
    <p class="text-gray-400 text-sm mt-2">
      Create your first task in any column
    </p>
  </div>
    
  <div
    class="flex gap-6 overflow-x-auto pb-10"
    style="height: calc(100vh - 140px)"
  >
    <KanbanColumn
      v-for="column in columns"
      :key="column.status"
      :title="column.title"
      :status="column.status"
      :tasks="tasksByStatus(currentProjectId, column.status)"
      @add-task="navigateToCreateTask(column.status)"
      @move-task="handleMoveTask"
      @edit-task="navigateToEditTask"
      @delete-task="deleteTask"
    />

    <!-- Floating Add Column (Future Feature Hint) -->
    <div class="flex-shrink-0 w-80">
      <BaseButton disabled>
        <LiPlus class="w-5 h-5" />
        Add another column
      </BaseButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import KanbanColumn from './KanbanColumn.vue'
import { useTaskStore } from '@/stores'
import type { TaskStatus } from '@/types/task'
import Logger from '@/utils/logger'
import { Plus as LiPlus } from 'lucide-vue-next'
import BaseButton from '@/components/ui/base/BaseButton.vue'
import { RouteNames } from '@/constants/routes'

const route = useRoute()
const router = useRouter()
const taskStore = useTaskStore()
const { tasksByStatus } = taskStore
const currentProjectId = computed(() => route.params.projectId as string)

const columns = [
  { status: `backlog` as const, title: `Backlog` },
  { status: `todo` as const, title: `To Do` },
  { status: `inprogress` as const, title: `In Progress` },
  { status: `done` as const, title: `Done` }
]

const navigateToCreateTask = async (status: TaskStatus): Promise<void> => {
  if (!currentProjectId.value) {
    Logger.error(`No current project set`)
    return
  }

  await router.push({
    name: RouteNames.CREATE_TASK,
    params: { projectId: currentProjectId.value },
    query: { status }
  })
}

const navigateToEditTask = async (taskId: string): Promise<void> => {
  if (!currentProjectId.value) {
    Logger.error(`No current project set`)
    return
  }

  await router.push({
    name: RouteNames.EDIT_TASK,
    params: {
      projectId: currentProjectId.value,
      taskId: taskId
    }
  })
}

const deleteTask = async (taskId: string): Promise<void> => {
  if (confirm(`Delete this task permanently?`)) {
    await taskStore.deleteTask(taskId)
  }
}

const handleMoveTask = async (taskId: string, newStatus: TaskStatus): Promise<void> => {
  const newOrder = taskStore.tasksByStatus(currentProjectId.value, newStatus).length
  await taskStore.moveTask(taskId, newStatus, newOrder)
}
</script>
