import { eq, and } from 'drizzle-orm'
import { type Database, getDefaultDb } from '../db'
import { tasks } from '../db/schema'
import { type Task } from '../types/task'

export interface TaskRepository {
  find: () => Promise<Task[]>
  findById: (id: string) => Promise<Task | undefined>
  findAllByProjectId: (projectId: string) => Promise<Task[]>
  findByProjectAndId: (projectId: string, taskId: string) => Promise<Task | undefined>
  create: (taskData: Omit<Task, `id` | `createdAt` | `updatedAt`>) => Promise<Task>
  update: (id: string, updates: Partial<Task>) => Promise<Task | undefined>
  delete: (id: string) => Promise<boolean>
}

const mapDbTaskToTask = (dbTask: typeof tasks.$inferSelect): Task => ({
  id: dbTask.id,
  projectId: dbTask.projectId,
  title: dbTask.title,
  description: dbTask.description ?? undefined,
  status: dbTask.status,
  order: dbTask.order,
  assigneeId: dbTask.assigneeId,
  createdAt: dbTask.createdAt.toISOString(),
  updatedAt: dbTask.updatedAt.toISOString()
})

/**
 * Creates a task repository with the given database connection.
 */
// eslint-disable-next-line max-lines-per-function
export function createTaskRepository(db: Database): TaskRepository {
  return {
    find: async (): Promise<Task[]> => {
      const result = await db.select().from(tasks)
      return result.map(mapDbTaskToTask)
    },

    findById: async (id: string): Promise<Task | undefined> => {
      const result = await db.select().from(tasks).where(eq(tasks.id, id))
      const task = result[0]
      return task ? mapDbTaskToTask(task) : undefined
    },

    findAllByProjectId: async (projectId: string): Promise<Task[]> => {
      const result = await db.select().from(tasks).where(eq(tasks.projectId, projectId))
      return result.map(mapDbTaskToTask)
    },

    findByProjectAndId: async (projectId: string, taskId: string): Promise<Task | undefined> => {
      const result = await db
        .select()
        .from(tasks)
        .where(and(eq(tasks.projectId, projectId), eq(tasks.id, taskId)))
      const task = result[0]
      return task ? mapDbTaskToTask(task) : undefined
    },

    create: async (taskData: Omit<Task, `id` | `createdAt` | `updatedAt`>): Promise<Task> => {
      const result = await db.insert(tasks).values({
        projectId: taskData.projectId,
        title: taskData.title,
        description: taskData.description,
        status: taskData.status,
        order: taskData.order,
        assigneeId: taskData.assigneeId
      }).returning()

      const task = result[0]
      if (!task) {
        throw new Error(`Failed to create task`)
      }
      return mapDbTaskToTask(task)
    },

    update: async (id: string, updates: Partial<Task>): Promise<Task | undefined> => {
      const { id: _id, createdAt: _createdAt, ...updateData } = updates

      const result = await db
        .update(tasks)
        .set({
          ...updateData,
          updatedAt: new Date()
        })
        .where(eq(tasks.id, id))
        .returning()

      const task = result[0]
      return task ? mapDbTaskToTask(task) : undefined
    },

    delete: async (id: string): Promise<boolean> => {
      const result = await db.delete(tasks).where(eq(tasks.id, id)).returning()
      return result.length > 0
    }
  }
}

/**
 * Default task repository using the default database connection.
 * Use this in production code.
 */
export const taskRepository: TaskRepository = createTaskRepository(getDefaultDb().db)
