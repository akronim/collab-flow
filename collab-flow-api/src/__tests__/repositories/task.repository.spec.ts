import { describe, it, expect, beforeEach } from 'vitest'
import { taskRepository } from '@/repositories/task.repository'
import { resetMockData, tasks } from '@/data/mockData'
import { type Task } from '@/types/task'

describe(`Task Repository`, () => {
  beforeEach(() => {
    resetMockData()
  })

  describe(`find`, () => {
    it(`should return all tasks`, async () => {
      const result = await taskRepository.find()

      expect(result).toHaveLength(5)
      expect(result[0]?.id).toBe(`task-1`)
    })
  })

  describe(`findById`, () => {
    it(`should return a task by id`, async () => {
      const result = await taskRepository.findById(`task-1`)

      expect(result).toBeDefined()
      expect(result?.title).toBe(`Implement authentication`)
    })

    it(`should return undefined for non-existent id`, async () => {
      const result = await taskRepository.findById(`non-existent`)

      expect(result).toBeUndefined()
    })
  })

  describe(`findByProjectId`, () => {
    it(`should return all tasks for a project`, async () => {
      const result = await taskRepository.findByProjectId(`proj-1`)

      expect(result).toHaveLength(3)
      expect(result.every(t => t.projectId === `proj-1`)).toBe(true)
    })

    it(`should return empty array for project with no tasks`, async () => {
      const result = await taskRepository.findByProjectId(`non-existent`)

      expect(result).toEqual([])
    })
  })

  describe(`create`, () => {
    it(`should create a new task with generated id and timestamps`, async () => {
      const newTaskData: Omit<Task, `id` | `createdAt` | `updatedAt`> = {
        projectId: `proj-1`,
        title: `New Task`,
        description: `A new task description`,
        status: `todo`,
        order: 10
      }

      const result = await taskRepository.create(newTaskData)

      expect(result.id).toBeDefined()
      expect(result.title).toBe(`New Task`)
      expect(result.createdAt).toBeDefined()
      expect(result.updatedAt).toBeDefined()
      expect(tasks).toHaveLength(6)
    })
  })

  describe(`update`, () => {
    it(`should update an existing task`, async () => {
      const updates: Partial<Task> = {
        title: `Updated Title`,
        status: `done`
      }

      const result = await taskRepository.update(`task-1`, updates)

      expect(result).toBeDefined()
      expect(result?.title).toBe(`Updated Title`)
      expect(result?.status).toBe(`done`)
      expect(result?.updatedAt).not.toBe(`2024-01-10T00:00:00.000Z`)
    })

    it(`should return undefined for non-existent task`, async () => {
      const result = await taskRepository.update(`non-existent`, { title: `Test` })

      expect(result).toBeUndefined()
    })

    it(`should not modify other fields`, async () => {
      const originalTask = await taskRepository.findById(`task-1`)
      const originalDescription = originalTask?.description

      await taskRepository.update(`task-1`, { title: `New Title` })
      const updatedTask = await taskRepository.findById(`task-1`)

      expect(updatedTask?.description).toBe(originalDescription)
    })
  })

  describe(`delete`, () => {
    it(`should delete an existing task and return true`, async () => {
      const result = await taskRepository.delete(`task-1`)

      expect(result).toBe(true)
      expect(tasks).toHaveLength(4)
      expect(tasks.find(t => t.id === `task-1`)).toBeUndefined()
    })

    it(`should return false for non-existent task`, async () => {
      const result = await taskRepository.delete(`non-existent`)

      expect(result).toBe(false)
      expect(tasks).toHaveLength(5)
    })
  })
})
