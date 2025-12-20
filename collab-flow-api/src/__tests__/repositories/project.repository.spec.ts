import { describe, it, expect, beforeEach } from 'vitest'
import { projectRepository } from '@/repositories/project.repository'
import { resetMockData, projects } from '@/data/mockData'
import { type ProjectRow } from '@/types/project'

describe(`Project Repository`, () => {
  beforeEach(() => {
    resetMockData()
  })

  describe(`find`, () => {
    it(`should return all projects with task counts`, async () => {
      const result = await projectRepository.find()
      expect(result).toHaveLength(2)
      expect(result[0]?.name).toBe(`SyncForge Frontend`)
      expect(result[0]?.taskCount).toBe(3)
    })
  })

  describe(`findById`, () => {
    it(`should return a project by id with task count`, async () => {
      const result = await projectRepository.findById(`proj-1`)
      expect(result).toBeDefined()
      expect(result?.name).toBe(`SyncForge Frontend`)
      expect(result?.taskCount).toBe(3)
    })

    it(`should return undefined for non-existent id`, async () => {
      const result = await projectRepository.findById(`non-existent`)
      expect(result).toBeUndefined()
    })
  })

  describe(`create`, () => {
    it(`should create a new project`, async () => {
      const newProjectData: Omit<ProjectRow, `id` | `createdAt` | `updatedAt`> = {
        name: `New Project`,
        description: `A brand new project`
      }
      const result = await projectRepository.create(newProjectData)
      expect(result.id).toBeDefined()
      expect(result.name).toBe(`New Project`)
      expect(result.taskCount).toBe(0)
      expect(projects).toHaveLength(3)
    })
  })

  describe(`update`, () => {
    it(`should update an existing project`, async () => {
      const updates = { name: `Updated Name` }
      const result = await projectRepository.update(`proj-1`, updates)
      expect(result).toBeDefined()
      expect(result?.name).toBe(`Updated Name`)
      expect(result?.description).toBe(`The main frontend application for SyncForge.`)
    })

    it(`should return undefined for non-existent project`, async () => {
      const result = await projectRepository.update(`non-existent`, { name: `Test` })
      expect(result).toBeUndefined()
    })
  })

  describe(`remove`, () => {
    it(`should delete an existing project`, async () => {
      await projectRepository.remove(`proj-1`)
      expect(projects).toHaveLength(1)
      expect(projects.find(p => p.id === `proj-1`)).toBeUndefined()
    })

    it(`should not throw for non-existent project`, async () => {
      await expect(projectRepository.remove(`non-existent`)).resolves.not.toThrow()
      expect(projects).toHaveLength(2)
    })
  })
})
