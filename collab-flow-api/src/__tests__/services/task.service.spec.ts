import { describe, it, expect, vi, beforeEach } from 'vitest'
import { taskService } from '@/services/task.service'
import { taskRepository } from '@/repositories/task.repository'
import { type Task } from '@/types/task'

// Mock the repository
vi.mock(`@/repositories/task.repository`)

describe(`Task Service`, () => {
  const mockTask: Task = {
    id: `1`,
    projectId: `1`,
    title: `Test Task`,
    status: `todo`,
    order: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe(`getAllTasks`, () => {
    it(`should get all tasks from the repository`, async () => {
      const mockTasks = [mockTask]
      vi.mocked(taskRepository.find).mockResolvedValue(mockTasks)

      const tasks = await taskService.getAllTasks()

      expect(taskRepository.find).toHaveBeenCalledOnce()
      expect(tasks).toEqual(mockTasks)
    })
  })

  describe(`getTaskById`, () => {
    it(`should get a task by id from the repository`, async () => {
      vi.mocked(taskRepository.findById).mockResolvedValue(mockTask)

      const task = await taskService.getTaskById(`1`)

      expect(taskRepository.findById).toHaveBeenCalledWith(`1`)
      expect(task).toEqual(mockTask)
    })
  })

  describe(`getTasksByProjectId`, () => {
    it(`should get tasks by project id from the repository`, async () => {
      const mockTasks = [mockTask]
      vi.mocked(taskRepository.findByProjectId).mockResolvedValue(mockTasks)

      const tasks = await taskService.getTasksByProjectId(`1`)

      expect(taskRepository.findByProjectId).toHaveBeenCalledWith(`1`)
      expect(tasks).toEqual(mockTasks)
    })
  })

  describe(`createTask`, () => {
    it(`should create a task using the repository`, async () => {
      const newTaskData: Omit<Task, `id` | `createdAt` | `updatedAt`> = {
        projectId: `1`,
        title: `New Task`,
        status: `backlog`,
        order: 2
      }
      vi.mocked(taskRepository.create).mockResolvedValue({ id: `2`, ...newTaskData, createdAt: ``, updatedAt: `` })

      const createdTask = await taskService.createTask(newTaskData)

      expect(taskRepository.create).toHaveBeenCalledWith(newTaskData)
      expect(createdTask.id).toBe(`2`)
      expect(createdTask.title).toBe(`New Task`)
    })
  })

  describe(`updateTask`, () => {
    it(`should update a task using the repository`, async () => {
      const updates: Partial<Task> = { title: `Updated Task` }
      const updatedTask = { ...mockTask, ...updates }
      vi.mocked(taskRepository.update).mockResolvedValue(updatedTask)

      const result = await taskService.updateTask(`1`, updates)

      expect(taskRepository.update).toHaveBeenCalledWith(`1`, updates)
      expect(result).toEqual(updatedTask)
    })

    it(`should return undefined for non-existent task`, async () => {
      vi.mocked(taskRepository.update).mockResolvedValue(undefined)

      const result = await taskService.updateTask(`non-existent`, { title: `Test` })

      expect(result).toBeUndefined()
    })
  })

  describe(`deleteTask`, () => {
    it(`should delete a task using the repository`, async () => {
      vi.mocked(taskRepository.delete).mockResolvedValue(true)

      const result = await taskService.deleteTask(`1`)

      expect(taskRepository.delete).toHaveBeenCalledWith(`1`)
      expect(result).toBe(true)
    })

    it(`should return false for non-existent task`, async () => {
      vi.mocked(taskRepository.delete).mockResolvedValue(false)

      const result = await taskService.deleteTask(`non-existent`)

      expect(result).toBe(false)
    })
  })
})
