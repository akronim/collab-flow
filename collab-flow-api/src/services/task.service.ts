import { type Task } from '../types/task'
import { taskRepository } from '../repositories/task.repository'

export const taskService = {
  getAllTasks: async (): Promise<Task[]> => {
    return await taskRepository.find()
  },

  getTaskById: async (id: string): Promise<Task | undefined> => {
    return await taskRepository.findById(id)
  },

  createTask: async (taskData: Omit<Task, `id` | `createdAt` | `updatedAt`>): Promise<Task> => {
    // In a real application, you might have business logic here.
    // For example, validating the taskData, checking permissions, etc.
    return await taskRepository.create(taskData)
  }
}
