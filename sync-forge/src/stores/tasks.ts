import { defineStore } from 'pinia'
import type { Task } from '@/types/task'
import { taskApiService } from '@/services/task.service'
import ApiCallResult from '@/utils/apiCallResult'

interface TaskState {
  tasks: Task[]
  loading: boolean
  error: unknown | null
}

export const useTaskStore = defineStore(`tasks`, {
  state: (): TaskState => ({
    tasks: [],
    loading: false,
    error: null
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
    taskCountByProjectId: (state) => {
      return (projectId: string) => {
        return state.tasks.filter((t) => t.projectId === projectId).length
      }
    }
  },

  actions: {
    async fetchAllTasks(): Promise<void> {
      this.loading = true
      this.error = null
      const result = await taskApiService.getAllTasks()
      if (result.isSuccess()) {
        this.tasks = result.data || []
      } else {
        this.error = result.error
      }
      this.loading = false
    },

    async getTaskById(id: string): Promise<Task | undefined> {
      this.loading = true
      this.error = null
      const result = await taskApiService.getTaskById(id)
      if (result.isSuccess()) {
        this.loading = false
        return result.data
      } else {
        this.error = result.error
        this.loading = false
        return undefined
      }
    },

    async addTask(task: Omit<Task, `id` | `createdAt` | `updatedAt`>): Promise<Task | undefined> {
      this.loading = true
      this.error = null
      const result = await taskApiService.createTask(task)
      if (result.isSuccess()) {
        if (result.data) {
          this.tasks.push(result.data)
        }
        this.loading = false
        return result.data
      } else {
        this.error = result.error
        this.loading = false
        return undefined
      }
    },

    async updateTask(id: string, updates: Partial<Task>): Promise<void> {
      // Placeholder: Implement actual API call when backend endpoint is available
      console.warn(`updateTask not yet implemented for API`)
      const task = this.tasks.find((t) => t.id === id)
      if (task) {
        Object.assign(task, { ...updates, updatedAt: new Date().toISOString() })
      }
    },

    async deleteTask(id: string): Promise<void> {
      // Placeholder: Implement actual API call when backend endpoint is available
      console.warn(`deleteTask not yet implemented for API`)
      this.tasks = this.tasks.filter((t) => t.id !== id)
    },

    async moveTask(taskId: string, newStatus: Task[`status`], newOrder: number): Promise<void> {
      // Placeholder: Implement actual API call when backend endpoint is available
      console.warn(`moveTask not yet implemented for API`)
      await this.updateTask(taskId, { status: newStatus, order: newOrder })
    }
  }
})
