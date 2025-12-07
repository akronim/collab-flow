import { type Project } from '../types/project'
import { type Task } from '../types/task'
import { type User } from '../types/user'

/**
 * Centralized mock data for the application.
 * All repositories should pull from these arrays.
 * This serves as a temporary in-memory database until a real DB is implemented.
 */

const initialUsers: User[] = [
  {
    id: `user-1`,
    name: `John Doe`,
    email: `john.doe@example.com`,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=john`,
    role: `admin`,
    title: `Senior Developer`,
    organization: `CollabFlow Inc.`,
    status: `active`,
    lastLogin: `2024-01-15T10:30:00.000Z`,
    createdAt: `2024-01-01T00:00:00.000Z`,
    updatedAt: `2024-01-15T10:30:00.000Z`
  },
  {
    id: `user-2`,
    name: `Jane Smith`,
    email: `jane.smith@example.com`,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=jane`,
    role: `member`,
    title: `Product Manager`,
    organization: `CollabFlow Inc.`,
    status: `active`,
    lastLogin: `2024-01-14T15:45:00.000Z`,
    createdAt: `2024-01-02T00:00:00.000Z`,
    updatedAt: `2024-01-14T15:45:00.000Z`
  }
]

const initialProjects: Project[] = [
  {
    id: `proj-1`,
    name: `SyncForge Frontend`,
    description: `The main frontend application for SyncForge.`,
    createdAt: `2024-01-01T00:00:00.000Z`
  },
  {
    id: `proj-2`,
    name: `CollabFlow API`,
    description: `The new backend API for tasks, projects, and users.`,
    createdAt: `2024-01-05T00:00:00.000Z`
  }
]

const initialTasks: Task[] = [
  {
    id: `task-1`,
    projectId: `proj-1`,
    title: `Implement authentication`,
    description: `Set up JWT authentication with refresh tokens.`,
    status: `done`,
    order: 1,
    createdAt: `2024-01-02T00:00:00.000Z`,
    updatedAt: `2024-01-10T00:00:00.000Z`
  },
  {
    id: `task-2`,
    projectId: `proj-1`,
    title: `Design database schema`,
    description: `Plan the schema for projects, tasks, and users.`,
    status: `inprogress`,
    order: 2,
    createdAt: `2024-01-03T00:00:00.000Z`,
    updatedAt: `2024-01-12T00:00:00.000Z`
  },
  {
    id: `task-3`,
    projectId: `proj-1`,
    title: `Setup CI/CD pipeline`,
    description: `Configure GitHub Actions for automated testing and deployment.`,
    status: `todo`,
    order: 3,
    createdAt: `2024-01-04T00:00:00.000Z`,
    updatedAt: `2024-01-04T00:00:00.000Z`
  },
  {
    id: `task-4`,
    projectId: `proj-2`,
    title: `Create API endpoints`,
    description: `Implement REST endpoints for CRUD operations.`,
    status: `inprogress`,
    order: 1,
    createdAt: `2024-01-06T00:00:00.000Z`,
    updatedAt: `2024-01-14T00:00:00.000Z`
  },
  {
    id: `task-5`,
    projectId: `proj-2`,
    title: `Add input validation`,
    description: `Implement request body validation using Zod.`,
    status: `backlog`,
    order: 2,
    createdAt: `2024-01-07T00:00:00.000Z`,
    updatedAt: `2024-01-07T00:00:00.000Z`
  }
]

/**
 * Runtime arrays that repositories will mutate.
 * These are initialized from the seed data.
 */
export let users: User[] = structuredClone(initialUsers)
export let projects: Project[] = structuredClone(initialProjects)
export let tasks: Task[] = structuredClone(initialTasks)

/**
 * Factory functions that return fresh copies of seed data.
 * Useful for tests to get a clean slate.
 */
export const createUserSeeds = (): User[] => structuredClone(initialUsers)
export const createProjectSeeds = (): Project[] => structuredClone(initialProjects)
export const createTaskSeeds = (): Task[] => structuredClone(initialTasks)

/**
 * Resets all runtime data to initial seed state.
 * Useful for tests or dev reset functionality.
 */
export const resetMockData = (): void => {
  users = structuredClone(initialUsers)
  projects = structuredClone(initialProjects)
  tasks = structuredClone(initialTasks)
}
