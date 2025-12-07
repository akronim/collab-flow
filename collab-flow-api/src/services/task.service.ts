import { type Task } from '../types/task'
import { taskRepository } from '../repositories/task.repository'

export const taskService = {
  getAllTasks: async (): Promise<Task[]> => {
    return await taskRepository.find()
  },

  getTaskById: async (id: string): Promise<Task | undefined> => {
    return await taskRepository.findById(id)
  },

  getTasksByProjectId: async (projectId: string): Promise<Task[]> => {
    return await taskRepository.findByProjectId(projectId)
  },

  createTask: async (taskData: Omit<Task, `id` | `createdAt` | `updatedAt`>): Promise<Task> => {
    return await taskRepository.create(taskData)
  },

  updateTask: async (id: string, updates: Partial<Task>): Promise<Task | undefined> => {
    return await taskRepository.update(id, updates)
  },

  deleteTask: async (id: string): Promise<boolean> => {
    return await taskRepository.delete(id)
  }
}
