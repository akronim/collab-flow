import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest'
import { createTestContext, type TestContext } from '../setup/test-db'
import { projects, tasks, users } from '@/db/schema'

const TEST_USER = {
  id: `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa`,
  name: `Test User`,
  email: `test@example.com`,
  role: `member` as const,
  status: `active` as const
}

const TEST_PROJECT = {
  id: `11111111-1111-1111-1111-111111111111`,
  name: `Test Project`,
  description: `Test project for tasks`
}

const TEST_PROJECT_2 = {
  id: `22222222-2222-2222-2222-222222222222`,
  name: `Test Project 2`,
  description: `Another test project`
}

const TEST_TASK_1 = {
  id: `aaaa1111-1111-1111-1111-111111111111`,
  projectId: TEST_PROJECT.id,
  title: `Task 1`,
  description: `First task`,
  status: `todo` as const,
  order: 1,
  assigneeId: TEST_USER.id
}

const TEST_TASK_2 = {
  id: `bbbb2222-2222-2222-2222-222222222222`,
  projectId: TEST_PROJECT.id,
  title: `Task 2`,
  description: `Second task`,
  status: `inprogress` as const,
  order: 2,
  assigneeId: null
}

const TEST_TASK_3 = {
  id: `cccc3333-3333-3333-3333-333333333333`,
  projectId: TEST_PROJECT_2.id,
  title: `Task 3`,
  description: `Task in another project`,
  status: `done` as const,
  order: 1,
  assigneeId: null
}

describe(`Task Repository`, () => {
  let ctx: TestContext

  beforeAll(() => {
    ctx = createTestContext()
  })

  afterAll(async () => {
    await ctx.close()
  })

  beforeEach(async () => {
    await ctx.resetDb()
    await ctx.db.insert(users).values(TEST_USER)
    await ctx.db.insert(projects).values([TEST_PROJECT, TEST_PROJECT_2])
    await ctx.db.insert(tasks).values([TEST_TASK_1, TEST_TASK_2, TEST_TASK_3])
  })

  describe(`find`, () => {
    it(`should return all tasks`, async () => {
      const result = await ctx.taskRepository.find()

      expect(result).toHaveLength(3)
    })

    it(`should return tasks with correct properties`, async () => {
      const result = await ctx.taskRepository.find()
      const task1 = result.find(t => t.id === TEST_TASK_1.id)

      expect(task1).toBeDefined()
      expect(task1?.title).toBe(TEST_TASK_1.title)
      expect(task1?.description).toBe(TEST_TASK_1.description)
      expect(task1?.status).toBe(TEST_TASK_1.status)
      expect(task1?.assigneeId).toBe(TEST_USER.id)
    })
  })

  describe(`findById`, () => {
    it(`should return a task by id`, async () => {
      const result = await ctx.taskRepository.findById(TEST_TASK_1.id)

      expect(result).toBeDefined()
      expect(result?.title).toBe(TEST_TASK_1.title)
    })

    it(`should return undefined for non-existent id`, async () => {
      const result = await ctx.taskRepository.findById(`99999999-9999-9999-9999-999999999999`)

      expect(result).toBeUndefined()
    })
  })

  describe(`findAllByProjectId`, () => {
    it(`should return all tasks for a project`, async () => {
      const result = await ctx.taskRepository.findAllByProjectId(TEST_PROJECT.id)

      expect(result).toHaveLength(2)
      expect(result.every(t => t.projectId === TEST_PROJECT.id)).toBe(true)
    })

    it(`should return empty array for project with no tasks`, async () => {
      const result = await ctx.taskRepository.findAllByProjectId(`99999999-9999-9999-9999-999999999999`)

      expect(result).toEqual([])
    })
  })

  describe(`findByProjectAndId`, () => {
    it(`should return task when both projectId and taskId match`, async () => {
      const result = await ctx.taskRepository.findByProjectAndId(TEST_PROJECT.id, TEST_TASK_1.id)

      expect(result).toBeDefined()
      expect(result?.id).toBe(TEST_TASK_1.id)
      expect(result?.projectId).toBe(TEST_PROJECT.id)
    })

    it(`should return undefined when projectId does not match`, async () => {
      const result = await ctx.taskRepository.findByProjectAndId(TEST_PROJECT_2.id, TEST_TASK_1.id)

      expect(result).toBeUndefined()
    })

    it(`should return undefined when taskId does not exist`, async () => {
      const result = await ctx.taskRepository.findByProjectAndId(TEST_PROJECT.id, `99999999-9999-9999-9999-999999999999`)

      expect(result).toBeUndefined()
    })
  })

  describe(`create`, () => {
    it(`should create a new task with generated id and timestamps`, async () => {
      const newTaskData = {
        projectId: TEST_PROJECT.id,
        title: `New Task`,
        description: `A new task description`,
        status: `todo` as const,
        order: 10,
        assigneeId: null
      }

      const result = await ctx.taskRepository.create(newTaskData)

      expect(result.id).toBeDefined()
      expect(result.title).toBe(newTaskData.title)
      expect(result.description).toBe(newTaskData.description)
      expect(result.status).toBe(newTaskData.status)
      expect(result.createdAt).toBeDefined()
      expect(result.updatedAt).toBeDefined()

      const allTasks = await ctx.taskRepository.find()
      expect(allTasks).toHaveLength(4)
    })

    it(`should create task with assignee`, async () => {
      const newTaskData = {
        projectId: TEST_PROJECT.id,
        title: `Assigned Task`,
        status: `todo` as const,
        order: 5,
        assigneeId: TEST_USER.id
      }

      const result = await ctx.taskRepository.create(newTaskData)

      expect(result.assigneeId).toBe(TEST_USER.id)
    })
  })

  describe(`update`, () => {
    it(`should update an existing task`, async () => {
      const updates = {
        title: `Updated Title`,
        status: `done` as const
      }

      const result = await ctx.taskRepository.update(TEST_TASK_1.id, updates)

      expect(result).toBeDefined()
      expect(result?.title).toBe(`Updated Title`)
      expect(result?.status).toBe(`done`)
    })

    it(`should return undefined for non-existent task`, async () => {
      const result = await ctx.taskRepository.update(`99999999-9999-9999-9999-999999999999`, { title: `Test` })

      expect(result).toBeUndefined()
    })

    it(`should not modify other fields`, async () => {
      const originalTask = await ctx.taskRepository.findById(TEST_TASK_1.id)
      const originalDescription = originalTask?.description

      const result = await ctx.taskRepository.update(TEST_TASK_1.id, { title: `New Title` })

      expect(result?.description).toBe(originalDescription)
    })

    it(`should update the updatedAt timestamp`, async () => {
      const before = await ctx.taskRepository.findById(TEST_TASK_1.id)

      await new Promise(resolve => setTimeout(resolve, 10))

      const result = await ctx.taskRepository.update(TEST_TASK_1.id, { title: `Updated` })

      expect(new Date(result!.updatedAt).getTime()).toBeGreaterThan(new Date(before!.updatedAt).getTime())
    })
  })

  describe(`delete`, () => {
    it(`should delete an existing task and return true`, async () => {
      const result = await ctx.taskRepository.delete(TEST_TASK_1.id)

      expect(result).toBe(true)

      const allTasks = await ctx.taskRepository.find()
      expect(allTasks).toHaveLength(2)
      expect(allTasks.find(t => t.id === TEST_TASK_1.id)).toBeUndefined()
    })

    it(`should return false for non-existent task`, async () => {
      const result = await ctx.taskRepository.delete(`99999999-9999-9999-9999-999999999999`)

      expect(result).toBe(false)

      const allTasks = await ctx.taskRepository.find()
      expect(allTasks).toHaveLength(3)
    })
  })
})
