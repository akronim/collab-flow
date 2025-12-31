import 'dotenv/config'
import { createDb } from '@/db'
import { users, projects, tasks } from './schema'
import { assertNotProduction } from './seed-guard'
import Logger from '@/utils/logger'
import config from '@/config'

// Stable UUIDs for seed data (generated once, reused for consistency)
const USER_1_ID = `11111111-1111-1111-1111-111111111111`
const USER_2_ID = `22222222-2222-2222-2222-222222222222`
const PROJ_1_ID = `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa`
const PROJ_2_ID = `bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb`
const TASK_1_ID = `11111111-aaaa-1111-aaaa-111111111111`
const TASK_2_ID = `22222222-aaaa-2222-aaaa-222222222222`
const TASK_3_ID = `33333333-aaaa-3333-aaaa-333333333333`
const TASK_4_ID = `44444444-bbbb-4444-bbbb-444444444444`
const TASK_5_ID = `55555555-bbbb-5555-bbbb-555555555555`

const seedUsers = [
  {
    id: USER_1_ID,
    name: `John Doe`,
    email: `john.doe@example.com`,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=john`,
    role: `admin` as const,
    title: `Senior Developer`,
    organization: `CollabFlow Inc.`,
    status: `active` as const,
    lastLogin: new Date(`2024-01-15T10:30:00.000Z`),
    createdAt: new Date(`2024-01-01T00:00:00.000Z`),
    updatedAt: new Date(`2024-01-15T10:30:00.000Z`)
  },
  {
    id: USER_2_ID,
    name: `Jane Smith`,
    email: `jane.smith@example.com`,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=jane`,
    role: `member` as const,
    title: `Product Manager`,
    organization: `CollabFlow Inc.`,
    status: `active` as const,
    lastLogin: new Date(`2024-01-14T15:45:00.000Z`),
    createdAt: new Date(`2024-01-02T00:00:00.000Z`),
    updatedAt: new Date(`2024-01-14T15:45:00.000Z`)
  }
]

const seedProjects = [
  {
    id: PROJ_1_ID,
    name: `SyncForge Frontend`,
    description: `The main frontend application for SyncForge.`,
    createdAt: new Date(`2024-01-01T00:00:00.000Z`),
    updatedAt: new Date(`2024-01-10T00:00:00.000Z`)
  },
  {
    id: PROJ_2_ID,
    name: `CollabFlow API`,
    description: `The new backend API for tasks, projects, and users.`,
    createdAt: new Date(`2024-01-05T00:00:00.000Z`),
    updatedAt: new Date(`2024-01-14T00:00:00.000Z`)
  }
]

const seedTasks = [
  {
    id: TASK_1_ID,
    projectId: PROJ_1_ID,
    title: `Implement authentication`,
    description: `Set up JWT authentication with refresh tokens.`,
    status: `done` as const,
    order: 1,
    assigneeId: USER_1_ID,
    createdAt: new Date(`2024-01-02T00:00:00.000Z`),
    updatedAt: new Date(`2024-01-10T00:00:00.000Z`)
  },
  {
    id: TASK_2_ID,
    projectId: PROJ_1_ID,
    title: `Design database schema`,
    description: `Plan the schema for projects, tasks, and users.`,
    status: `inprogress` as const,
    order: 2,
    assigneeId: USER_2_ID,
    createdAt: new Date(`2024-01-03T00:00:00.000Z`),
    updatedAt: new Date(`2024-01-12T00:00:00.000Z`)
  },
  {
    id: TASK_3_ID,
    projectId: PROJ_1_ID,
    title: `Setup CI/CD pipeline`,
    description: `Configure GitHub Actions for automated testing and deployment.`,
    status: `todo` as const,
    order: 3,
    assigneeId: null,
    createdAt: new Date(`2024-01-04T00:00:00.000Z`),
    updatedAt: new Date(`2024-01-04T00:00:00.000Z`)
  },
  {
    id: TASK_4_ID,
    projectId: PROJ_2_ID,
    title: `Create API endpoints`,
    description: `Implement REST endpoints for CRUD operations.`,
    status: `inprogress` as const,
    order: 1,
    assigneeId: USER_1_ID,
    createdAt: new Date(`2024-01-06T00:00:00.000Z`),
    updatedAt: new Date(`2024-01-14T00:00:00.000Z`)
  },
  {
    id: TASK_5_ID,
    projectId: PROJ_2_ID,
    title: `Add input validation`,
    description: `Implement request body validation using Zod.`,
    status: `backlog` as const,
    order: 2,
    assigneeId: null,
    createdAt: new Date(`2024-01-07T00:00:00.000Z`),
    updatedAt: new Date(`2024-01-07T00:00:00.000Z`)
  }
]

async function seed(options?: { force?: boolean }): Promise<void> {
  // Guard against running in production
  assertNotProduction({ force: options?.force })

  Logger.log(`Seeding database...`)

  const connection = createDb(config.db.url)
  const db = connection.db

  try {
    // Clear existing data (order matters due to FK constraints)
    Logger.log(`Clearing existing data...`)
    await db.delete(tasks)
    await db.delete(projects)
    await db.delete(users)

    // Insert seed data
    Logger.log(`Inserting users...`)
    await db.insert(users).values(seedUsers)

    Logger.log(`Inserting projects...`)
    await db.insert(projects).values(seedProjects)

    Logger.log(`Inserting tasks...`)
    await db.insert(tasks).values(seedTasks)

    Logger.log(`Seeding complete!`)
  } finally {
    await connection.close()
  }
}

// Parse command line arguments
const args = process.argv.slice(2)
const force = args.includes(`--force`)

seed({ force }).catch((error: unknown) => {
  Logger.error(`Seeding failed:`, error)
  process.exit(1)
})
