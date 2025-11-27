import { describe, it, expect, beforeEach } from 'vitest'
import { taskService } from '@/services/task.service'
import { type Task } from '@/types/task'

// This is a hack to reset the in-memory data between tests.
let tasks: Task[] = [
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

vi.mock(`@/services/task.service`, () => {
  return {
    taskService: {
      getAllTasks: vi.fn(async () => tasks),
      getTaskById: vi.fn(async (id: string) => tasks.find(task => task.id === id)),
      createTask: vi.fn(async (taskData: Omit<Task, `id` | `createdAt` | `updatedAt`>) => {
        const newTask: Task = {
          id: String(tasks.length + 1),
          ...taskData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        tasks.push(newTask)
        return newTask
      })
    }
  }
})

describe(`Task Service`, () => {
  beforeEach(() => {
    // Reset tasks before each test
    tasks = [
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
    vi.clearAllMocks()
  })

  it(`should return all tasks`, async () => {
    const result = await taskService.getAllTasks()
    expect(result).toBeInstanceOf(Array)
    expect(result.length).toBe(2)
  })

  it(`should return a task by id`, async () => {
    const task = await taskService.getTaskById(`1`)
    expect(task).toBeDefined()
    expect(task?.id).toBe(`1`)
  })

  it(`should return undefined for a non-existent task`, async () => {
    const task = await taskService.getTaskById(`999`)
    expect(task).toBeUndefined()
  })

  it(`should create a new task`, async () => {
    const newTaskData: Omit<Task, `id` | `createdAt` | `updatedAt`> = {
      projectId: `2`,
      title: `New test task`,
      status: `todo`,
      order: 3
    }
    const createdTask = await taskService.createTask(newTaskData)
    expect(createdTask).toBeDefined()
    expect(createdTask.id).toBe(`3`)
    expect(createdTask.title).toBe(newTaskData.title)

    const allTasks = await taskService.getAllTasks()
    expect(allTasks.length).toBe(3)
  })
})
