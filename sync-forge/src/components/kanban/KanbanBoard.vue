<template>
  <div
    v-if="taskStore.tasksForCurrentProject.length === 0"
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
    class="flex gap-6 overflow-x-auto pb-10 px-6"
    style="height: calc(100vh - 140px)"
  >
    <KanbanColumn
      v-for="column in columns"
      :key="column.status"
      :title="column.title"
      :status="column.status"
      :tasks="tasksByStatus(column.status)"
      @add-task="openTaskForm(column.status)"
      @move-task="handleMoveTask"
      @edit-task="openEditForm"
      @delete-task="deleteTask"
    />

    <!-- Floating Add Column (Future Feature Hint) -->
    <div class="flex-shrink-0 w-80">
      <button
        class="w-full h-12 bg-gray-200/70 rounded-lg flex items-center justify-center gap-2 
                text-gray-600 hover:bg-gray-300 transition"
        disabled
      >
        <svg
          class="w-5 h-5"
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
        Add another column
      </button>
    </div>

    <!-- Modal -->
    <TaskFormModal
      v-if="isModalOpen"
      :task="editingTask"
      @close="closeModal"
      @save="saveTask"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import KanbanColumn from './KanbanColumn.vue'
import TaskFormModal from './TaskFormModal.vue'
import { useTaskStore } from '@/stores'
import type { Task, TaskStatus } from '@/types/task'
import Logger from '@/utils/logger'

const taskStore = useTaskStore()
const { tasksByStatus } = taskStore
const currentProjectId = computed(() => taskStore.currentProjectId)

const isModalOpen = ref(false)
const editingTask = ref<Task | null>(null)
const targetStatus = ref<TaskStatus>(`todo`)

const columns = [
  { status: `backlog` as const, title: `Backlog` },
  { status: `todo` as const, title: `To Do` },
  { status: `inprogress` as const, title: `In Progress` },
  { status: `done` as const, title: `Done` }
]

const openTaskForm = (status: TaskStatus): void => {
  if (!currentProjectId.value) {
    Logger.error(`No current project set`)
    return
  }

  editingTask.value = null
  targetStatus.value = status
  isModalOpen.value = true
}

const openEditForm = (task: Task): void => {
  editingTask.value = task
  targetStatus.value = task.status
  isModalOpen.value = true
}

const closeModal = (): void => {
  isModalOpen.value = false
  editingTask.value = null
}

const saveTask = (data: { title: string; description: string }): void => {
  if (!currentProjectId.value) {
    Logger.error(`No current project set`)
    return
  }

  if (editingTask.value) {
    taskStore.updateTask(editingTask.value.id, {
      title: data.title,
      description: data.description
    })
  } else {
    taskStore.addTask({
      projectId: currentProjectId.value,
      title: data.title,
      description: data.description,
      status: targetStatus.value,
      order: taskStore.tasksByStatus(targetStatus.value).length
    })
  }
  closeModal()
}

const deleteTask = (taskId: string): void => {
  if (confirm(`Delete this task permanently?`)) {
    taskStore.deleteTask(taskId)
  }
}

const handleMoveTask = (taskId: string, newStatus: TaskStatus): void => {
  const newOrder = taskStore.tasksByStatus(newStatus).length
  taskStore.moveTask(taskId, newStatus, newOrder)
}
</script>
