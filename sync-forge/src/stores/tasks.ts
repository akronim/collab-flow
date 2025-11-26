import { defineStore } from 'pinia'
import type { Task } from '@/types/task'
import { v4 as uuidv4 } from 'uuid'

interface TaskState {
  tasks: Task[]
}

const mockTasks: Task[] = [
  {
    id: `1`,
    projectId: `1`,
    title: `Design homepage`,
    description: `Create mockups in Figma`,
    status: `todo`,
    order: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: `2`,
    projectId: `1`,
    title: `Setup Vue project`,
    description: `With Vite + Tailwind + Pinia`,
    status: `inprogress`,
    order: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: `3`,
    projectId: `1`,
    title: `User authentication`,
    description: `Implement login flow`,
    status: `done`,
    order: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]

export const useTaskStore = defineStore(`tasks`, {
  state: (): TaskState => ({
    tasks: mockTasks
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
    getTaskById(projectId: string, taskId: string): Task | undefined {
      return this.tasks.find((t) => t.projectId === projectId && t.id === taskId)
    },

    addTask(task: Omit<Task, `id` | `createdAt` | `updatedAt`>): void {
      const newTask: Task = {
        ...task,
        id: uuidv4(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      this.tasks.push(newTask)
    },

    updateTask(id: string, updates: Partial<Task>): void {
      const task = this.tasks.find((t) => t.id === id)
      if (task) {
        Object.assign(task, { ...updates, updatedAt: new Date().toISOString() })
      }
    },

    deleteTask(id: string): void {
      this.tasks = this.tasks.filter((t) => t.id !== id)
    },

    moveTask(taskId: string, newStatus: Task[`status`], newOrder: number): void {
      this.updateTask(taskId, { status: newStatus, order: newOrder })
    }
  }
})
