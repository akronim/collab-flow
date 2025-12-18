import { defineStore } from 'pinia'
import type { Task } from '@/types/task'
import { taskApiService } from '@/services/task.service'
import { showErrorNotification, showSuccessNotification } from '@/utils/notificationHelper'
import { NotificationMessages } from '@/constants/notificationMessages'

interface TaskState {
  tasks: Task[]
}

export const useTaskStore = defineStore(`tasks`, {
  state: (): TaskState => ({
    tasks: []
  }),

  getters: {
    tasksForCurrentProject: (state) => {
      return (projectId: string): Task[] => {
        if (!projectId) {
          return []
        }
        return state.tasks
          .filter((t) => t.projectId === projectId)
          .sort((a, b) => a.order - b.order)
      }
    },
    tasksByStatus: (state) => {
      return (projectId: string, status: Task[`status`]): Task[] => {
        if (!projectId) {
          return []
        }
        return state.tasks
          .filter((t) => t.projectId === projectId && t.status === status)
          .sort((a, b) => a.order - b.order)
      }
    },
    tasksByProjectId: (state) => {
      return (projectId: string): Task[] => {
        if (!projectId) {
          return []
        }
        return state.tasks.filter((t) => t.projectId === projectId)
      }
    },
    taskCountByProjectId(): (projectId: string) => number {
      return (projectId: string) => {
        return this.tasksByProjectId(projectId).length
      }
    }
  },

  actions: {
    async fetchTasksByProjectId(projectId: string): Promise<void> {
      const result = await taskApiService.getTasksByProjectId(projectId)
      if (result.isSuccess()) {
        this.tasks = result.data || []
      } else {
        showErrorNotification(result.error, NotificationMessages.FETCH_FAILED)
      }
    },

    async getTaskById(projectId: string, taskId: string): Promise<Task | undefined> {
      const result = await taskApiService.getTaskById(taskId)
      if (result.isSuccess()) {
        return result.data
      } else {
        showErrorNotification(result.error, NotificationMessages.FETCH_FAILED)
        return undefined
      }
    },

    async addTask(task: Omit<Task, `id` | `createdAt` | `updatedAt`>): Promise<Task | undefined> {
      const result = await taskApiService.createTask(task)
      if (result.isSuccess() && result.data) {
        this.tasks.push(result.data)
        showSuccessNotification(NotificationMessages.CREATED)
        return result.data
      }
      showErrorNotification(result.error, NotificationMessages.SAVE_FAILED)
      return undefined
    },

    async updateTask(id: string, updates: Partial<Task>): Promise<void> {
      const result = await taskApiService.updateTask(id, updates)
      if (result.isSuccess() && result.data) {
        const index = this.tasks.findIndex((t) => t.id === id)
        if (index !== -1) {
          this.tasks[index] = result.data
        }
        showSuccessNotification(NotificationMessages.UPDATED)
      } else {
        showErrorNotification(result.error, NotificationMessages.SAVE_FAILED)
      }
    },

    async deleteTask(id: string): Promise<void> {
      const result = await taskApiService.deleteTask(id)
      if (result.isSuccess()) {
        this.tasks = this.tasks.filter((t) => t.id !== id)
        showSuccessNotification(NotificationMessages.DELETED)
      } else {
        showErrorNotification(result.error, NotificationMessages.DELETE_FAILED)
      }
    },

    async moveTask(taskId: string, newStatus: Task[`status`], newOrder: number): Promise<void> {
      await this.updateTask(taskId, { status: newStatus, order: newOrder })
    }
  }
})
