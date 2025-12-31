import { createDb, type Database, type DbConnection } from '@/db'
import { users, projects, tasks, sessions } from '@/db/schema'
import { createProjectRepository, type ProjectRepository } from '@/repositories/project.repository'
import { createTaskRepository, type TaskRepository } from '@/repositories/task.repository'
import { createUserRepository, type UserRepository } from '@/repositories/user.repository'
import config from '@/config'
import { TEST_DB_PREFIX } from './constants'

export interface TestContext {
  db: Database
  connection: DbConnection
  projectRepository: ProjectRepository
  taskRepository: TaskRepository
  userRepository: UserRepository
  resetDb: () => Promise<void>
  close: () => Promise<void>
}

/**
 * Gets the database URL for the current test worker.
 * Each worker (VITEST_POOL_ID) connects to its own isolated database.
 */
function getWorkerDatabaseUrl(): string {
  // Extract base URL (without database name)
  const lastSlashIndex = config.db.url.lastIndexOf(`/`)
  const urlWithoutDb = config.db.url.substring(0, lastSlashIndex)

  // VITEST_POOL_ID is 1-based index of the worker
  const workerId = process.env.VITEST_POOL_ID || `1`

  return `${urlWithoutDb}/${TEST_DB_PREFIX}_${workerId}`
}

/**
 * Creates an isolated test context with its own database connection.
 * Each test file gets a connection to a worker-specific database,
 * enabling parallel test execution without data conflicts.
 */
export function createTestContext(): TestContext {
  const workerDbUrl = getWorkerDatabaseUrl()
  const connection = createDb(workerDbUrl)
  const db = connection.db

  const projectRepository = createProjectRepository(db)
  const taskRepository = createTaskRepository(db)
  const userRepository = createUserRepository(db)

  return {
    db,
    connection,
    projectRepository,
    taskRepository,
    userRepository,

    resetDb: async (): Promise<void> => {
      // Use transaction for atomic cleanup
      await db.transaction(async tx => {
        // Order matters due to FK constraints
        await tx.delete(sessions)
        await tx.delete(tasks)
        await tx.delete(projects)
        await tx.delete(users)
      })
    },

    close: async (): Promise<void> => {
      await connection.close()
    }
  }
}
