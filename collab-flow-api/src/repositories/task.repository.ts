import { type Task } from '../types/task'
import { tasks } from '../data/mockData'
import { randomUUID } from 'crypto'

export const taskRepository = {
  find: async (): Promise<Task[]> => {
    return tasks
  },

  findById: async (id: string): Promise<Task | undefined> => {
    return tasks.find(task => task.id === id)
  },

  findAllByProjectId: async (projectId: string): Promise<Task[]> => {
    return tasks.filter(task => task.projectId === projectId)
  },

  findByProjectAndId: async (projectId: string, taskId: string): Promise<Task | undefined> => {
    return tasks.find(task => task.projectId === projectId && task.id === taskId)
  },

  create: async (taskData: Omit<Task, `id` | `createdAt` | `updatedAt`>): Promise<Task> => {
    const newTask: Task = {
      id: randomUUID(),
      ...taskData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    tasks.push(newTask)
    return newTask
  },

  update: async (id: string, updates: Partial<Task>): Promise<Task | undefined> => {
    const index = tasks.findIndex(task => task.id === id)
    if (index === -1) {
      return undefined
    }
    const updatedTask: Task = {
      ...tasks[index],
      ...updates,
      id: tasks[index].id,
      updatedAt: new Date().toISOString()
    }
    tasks[index] = updatedTask
    return updatedTask
  },

  delete: async (id: string): Promise<boolean> => {
    const index = tasks.findIndex(task => task.id === id)
    if (index === -1) {
      return false
    }
    tasks.splice(index, 1)
    return true
  }
}
