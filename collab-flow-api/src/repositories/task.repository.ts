import { type Task } from '../types/task'

const tasks: Task[] = [
  {
    id: `1`,
    projectId: `1`,
    title: `Implement authentication`,
    description: `Set up JWT authentication with refresh tokens.`,
    status: `done`,
    order: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: `2`,
    projectId: `1`,
    title: `Design database schema`,
    description: `Plan the schema for projects, tasks, and users.`,
    status: `inprogress`,
    order: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]

export const taskRepository = {
  find: async (): Promise<Task[]> => {
    return tasks
  },

  findById: async (id: string): Promise<Task | undefined> => {
    return tasks.find(task => task.id === id)
  },

  create: async (taskData: Omit<Task, `id` | `createdAt` | `updatedAt`>): Promise<Task> => {
    const newTask: Task = {
      id: String(tasks.length + 1),
      ...taskData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    tasks.push(newTask)
    return newTask
  }
}
