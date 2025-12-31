import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest'
import { createTestContext, type TestContext } from '../setup/test-db'
import { projects, tasks } from '@/db/schema'

const TEST_PROJECT_1 = {
  id: `11111111-1111-1111-1111-111111111111`,
  name: `Test Project 1`,
  description: `First test project`
}

const TEST_PROJECT_2 = {
  id: `22222222-2222-2222-2222-222222222222`,
  name: `Test Project 2`,
  description: `Second test project`
}

describe(`Project Repository`, () => {
  let ctx: TestContext

  beforeAll(() => {
    ctx = createTestContext()
  })

  afterAll(async () => {
    await ctx.close()
  })

  beforeEach(async () => {
    await ctx.resetDb()
    await ctx.db.insert(projects).values([TEST_PROJECT_1, TEST_PROJECT_2])
  })

  describe(`find`, () => {
    it(`should return all projects with task counts`, async () => {
      const result = await ctx.projectRepository.find()

      expect(result).toHaveLength(2)
      expect(result.map(p => p.name)).toContain(TEST_PROJECT_1.name)
      expect(result.map(p => p.name)).toContain(TEST_PROJECT_2.name)
      expect(result[0]?.taskCount).toBe(0)
    })

    it(`should return correct task count when tasks exist`, async () => {
      await ctx.db.insert(tasks).values([
        { projectId: TEST_PROJECT_1.id, title: `Task 1`, status: `todo`, order: 1 },
        { projectId: TEST_PROJECT_1.id, title: `Task 2`, status: `todo`, order: 2 }
      ])

      const result = await ctx.projectRepository.find()
      const project1 = result.find(p => p.id === TEST_PROJECT_1.id)

      expect(project1?.taskCount).toBe(2)
    })
  })

  describe(`findById`, () => {
    it(`should return a project by id with task count`, async () => {
      const result = await ctx.projectRepository.findById(TEST_PROJECT_1.id)

      expect(result).toBeDefined()
      expect(result?.name).toBe(TEST_PROJECT_1.name)
      expect(result?.description).toBe(TEST_PROJECT_1.description)
      expect(result?.taskCount).toBe(0)
    })

    it(`should return undefined for non-existent id`, async () => {
      const result = await ctx.projectRepository.findById(`99999999-9999-9999-9999-999999999999`)

      expect(result).toBeUndefined()
    })
  })

  describe(`create`, () => {
    it(`should create a new project`, async () => {
      const newProjectData = {
        name: `New Project`,
        description: `A brand new project`
      }

      const result = await ctx.projectRepository.create(newProjectData)

      expect(result.id).toBeDefined()
      expect(result.name).toBe(newProjectData.name)
      expect(result.description).toBe(newProjectData.description)
      expect(result.taskCount).toBe(0)
      expect(result.createdAt).toBeDefined()
      expect(result.updatedAt).toBeDefined()

      const allProjects = await ctx.projectRepository.find()
      expect(allProjects).toHaveLength(3)
    })
  })

  describe(`update`, () => {
    it(`should update an existing project`, async () => {
      const updates = { name: `Updated Name` }

      const result = await ctx.projectRepository.update(TEST_PROJECT_1.id, updates)

      expect(result).toBeDefined()
      expect(result?.name).toBe(`Updated Name`)
      expect(result?.description).toBe(TEST_PROJECT_1.description)
    })

    it(`should return undefined for non-existent project`, async () => {
      const result = await ctx.projectRepository.update(`99999999-9999-9999-9999-999999999999`, { name: `Test` })

      expect(result).toBeUndefined()
    })

    it(`should update the updatedAt timestamp`, async () => {
      const before = await ctx.projectRepository.findById(TEST_PROJECT_1.id)

      // Small delay to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10))

      const result = await ctx.projectRepository.update(TEST_PROJECT_1.id, { name: `Updated` })

      expect(new Date(result!.updatedAt).getTime()).toBeGreaterThan(new Date(before!.updatedAt).getTime())
    })
  })

  describe(`remove`, () => {
    it(`should delete an existing project and return true`, async () => {
      const result = await ctx.projectRepository.remove(TEST_PROJECT_1.id)

      expect(result).toBe(true)
      const allProjects = await ctx.projectRepository.find()
      expect(allProjects).toHaveLength(1)
      expect(allProjects.find(p => p.id === TEST_PROJECT_1.id)).toBeUndefined()
    })

    it(`should return false for non-existent project`, async () => {
      const result = await ctx.projectRepository.remove(`99999999-9999-9999-9999-999999999999`)

      expect(result).toBe(false)
      const allProjects = await ctx.projectRepository.find()
      expect(allProjects).toHaveLength(2)
    })

    it(`should cascade delete associated tasks`, async () => {
      await ctx.db.insert(tasks).values([
        { projectId: TEST_PROJECT_1.id, title: `Task 1`, status: `todo`, order: 1 }
      ])

      const result = await ctx.projectRepository.remove(TEST_PROJECT_1.id)

      expect(result).toBe(true)
      const remainingTasks = await ctx.db.select().from(tasks)
      expect(remainingTasks).toHaveLength(0)
    })
  })
})
