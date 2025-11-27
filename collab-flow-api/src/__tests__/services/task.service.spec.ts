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

  it(`should get all tasks from the repository`, async () => {
    const mockTasks = [mockTask]
    vi.mocked(taskRepository.find).mockResolvedValue(mockTasks)

    const tasks = await taskService.getAllTasks()

    expect(taskRepository.find).toHaveBeenCalledOnce()
    expect(tasks).toEqual(mockTasks)
  })

  it(`should get a task by id from the repository`, async () => {
    vi.mocked(taskRepository.findById).mockResolvedValue(mockTask)

    const task = await taskService.getTaskById(`1`)

    expect(taskRepository.findById).toHaveBeenCalledWith(`1`)
    expect(task).toEqual(mockTask)
  })

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
