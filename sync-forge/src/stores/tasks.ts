import { defineStore } from 'pinia'
import type { Task } from '@/types/task'
import { taskApiService } from '@/services/task.service'
import Logger from '@/utils/logger'

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
        Logger.apiError(result.error, { message: `Failed to fetch tasks for project ${projectId}` })
      }
    },

    getTaskById(projectId: string, taskId: string): Task | undefined {
      return this.tasks.find((t) => t.projectId === projectId && t.id === taskId)
    },

    async addTask(task: Omit<Task, `id` | `createdAt` | `updatedAt`>): Promise<Task | undefined> {
      const result = await taskApiService.createTask(task)
      if (result.isSuccess() && result.data) {
        this.tasks.push(result.data)
        return result.data
      }
      Logger.apiError(result.error, { message: `Failed to create task` })
      return undefined
    },

    async updateTask(id: string, updates: Partial<Task>): Promise<void> {
      const result = await taskApiService.updateTask(id, updates)
      if (result.isSuccess() && result.data) {
        const index = this.tasks.findIndex((t) => t.id === id)
        if (index !== -1) {
          this.tasks[index] = result.data
        }
      } else {
        Logger.apiError(result.error, { message: `Failed to update task ${id}` })
      }
    },

    async deleteTask(id: string): Promise<void> {
      const result = await taskApiService.deleteTask(id)
      if (result.isSuccess()) {
        this.tasks = this.tasks.filter((t) => t.id !== id)
      } else {
        Logger.apiError(result.error, { message: `Failed to delete task ${id}` })
      }
    },

    async moveTask(taskId: string, newStatus: Task[`status`], newOrder: number): Promise<void> {
      await this.updateTask(taskId, { status: newStatus, order: newOrder })
    }
  }
})
