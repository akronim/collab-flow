import { eq, count } from 'drizzle-orm'
import { type Database, getDefaultDb } from '../db'
import { projects, tasks } from '../db/schema'
import { type Project, type ProjectRow } from '../types/project'

export interface ProjectRepository {
  find: () => Promise<Project[]>
  findById: (id: string) => Promise<Project | undefined>
  create: (projectData: Omit<ProjectRow, `id` | `createdAt` | `updatedAt`>) => Promise<Project>
  update: (id: string, projectData: Partial<Omit<ProjectRow, `id` | `createdAt` | `updatedAt`>>) => Promise<Project | undefined>
  remove: (id: string) => Promise<boolean>
}

const mapDbProjectToProjectRow = (dbProject: typeof projects.$inferSelect): ProjectRow => ({
  id: dbProject.id,
  name: dbProject.name,
  description: dbProject.description,
  createdAt: dbProject.createdAt.toISOString(),
  updatedAt: dbProject.updatedAt.toISOString()
})

/**
 * Creates a project repository with the given database connection.
 */
// eslint-disable-next-line max-lines-per-function
export function createProjectRepository(db: Database): ProjectRepository {
  return {
    find: async (): Promise<Project[]> => {
      const result = await db
        .select({
          id: projects.id,
          name: projects.name,
          description: projects.description,
          createdAt: projects.createdAt,
          updatedAt: projects.updatedAt,
          taskCount: count(tasks.id)
        })
        .from(projects)
        .leftJoin(tasks, eq(projects.id, tasks.projectId))
        .groupBy(projects.id)

      return result.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        taskCount: row.taskCount
      }))
    },

    findById: async (id: string): Promise<Project | undefined> => {
      const result = await db
        .select({
          id: projects.id,
          name: projects.name,
          description: projects.description,
          createdAt: projects.createdAt,
          updatedAt: projects.updatedAt,
          taskCount: count(tasks.id)
        })
        .from(projects)
        .leftJoin(tasks, eq(projects.id, tasks.projectId))
        .where(eq(projects.id, id))
        .groupBy(projects.id)

      const project = result[0]
      if (!project) {
        return undefined
      }

      return {
        id: project.id,
        name: project.name,
        description: project.description,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
        taskCount: project.taskCount
      }
    },

    create: async (
      projectData: Omit<ProjectRow, `id` | `createdAt` | `updatedAt`>
    ): Promise<Project> => {
      const result = await db.insert(projects).values({
        name: projectData.name,
        description: projectData.description
      }).returning()

      const project = result[0]
      if (!project) {
        throw new Error(`Failed to create project`)
      }

      return {
        ...mapDbProjectToProjectRow(project),
        taskCount: 0
      }
    },

    update: async (
      id: string,
      projectData: Partial<Omit<ProjectRow, `id` | `createdAt` | `updatedAt`>>
    ): Promise<Project | undefined> => {
      const result = await db
        .update(projects)
        .set({
          ...projectData,
          updatedAt: new Date()
        })
        .where(eq(projects.id, id))
        .returning()

      const project = result[0]
      if (!project) {
        return undefined
      }

      // Get the task count for this project
      const taskCountResult = await db
        .select({ count: count() })
        .from(tasks)
        .where(eq(tasks.projectId, id))

      return {
        ...mapDbProjectToProjectRow(project),
        taskCount: taskCountResult[0]?.count ?? 0
      }
    },

    remove: async (id: string): Promise<boolean> => {
      const result = await db.delete(projects).where(eq(projects.id, id)).returning({ id: projects.id })
      return result.length > 0
    }
  }
}

/**
 * Default project repository using the default database connection.
 * Use this in production code.
 */
export const projectRepository: ProjectRepository = createProjectRepository(getDefaultDb().db)
