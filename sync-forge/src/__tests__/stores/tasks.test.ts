import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useTaskStore } from '@/stores'
import { taskApiService } from '@/services/task.service'
import ApiCallResult from '@/utils/apiCallResult'
import { mockTasks } from '../mocks'
import type { Task } from '@/types/task'

vi.mock(`@/services/task.service`)

const getFirstMockTask = (): Task => {
  const task = mockTasks[0]
  if (!task) {
    throw new Error(`Mock task not found`)
  }
  return task
}

describe(`useTaskStore`, () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe(`initial state`, () => {
    it(`should have empty tasks array initially`, () => {
      const store = useTaskStore()

      expect(store.tasks).toStrictEqual([])
    })
  })

  describe(`fetchTasksByProjectId`, () => {
    it(`should fetch tasks and update state`, async () => {
      vi.mocked(taskApiService.getTasksByProjectId).mockResolvedValue(
        ApiCallResult.Success(mockTasks, 200)
      )

      const store = useTaskStore()
      await store.fetchTasksByProjectId(`proj-1`)

      expect(taskApiService.getTasksByProjectId).toHaveBeenCalledWith(`proj-1`)
      expect(store.tasks).toStrictEqual(mockTasks)
    })

    it(`should handle API error gracefully`, async () => {
      vi.mocked(taskApiService.getTasksByProjectId).mockResolvedValue(
        ApiCallResult.Fail(new Error(`Network error`))
      )

      const store = useTaskStore()
      await store.fetchTasksByProjectId(`proj-1`)

      expect(store.tasks).toStrictEqual([])
    })
  })

  describe(`addTask`, () => {
    it(`should create task via API and add to state`, async () => {
      const newTaskData: Omit<Task, `id` | `createdAt` | `updatedAt`> = {
        projectId: `proj-1`,
        title: `New Task`,
        status: `todo`,
        order: 0
      }
      const createdTask: Task = {
        ...newTaskData,
        id: `new-task-id`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      vi.mocked(taskApiService.createTask).mockResolvedValue(
        ApiCallResult.Success(createdTask, 201)
      )

      const store = useTaskStore()
      const result = await store.addTask(newTaskData)

      expect(taskApiService.createTask).toHaveBeenCalledWith(newTaskData)
      expect(store.tasks).toContainEqual(createdTask)
      expect(result).toStrictEqual(createdTask)
    })

    it(`should return undefined on API error`, async () => {
      vi.mocked(taskApiService.createTask).mockResolvedValue(
        ApiCallResult.Fail(new Error(`Network error`))
      )

      const store = useTaskStore()
      const result = await store.addTask({
        projectId: `proj-1`,
        title: `New Task`,
        status: `todo`,
        order: 0
      })

      expect(result).toBeUndefined()
    })
  })

  describe(`updateTask`, () => {
    it(`should update task via API and update state`, async () => {
      const existingTask = getFirstMockTask()
      const updates: Partial<Task> = { title: `Updated Title` }
      const updatedTask = { ...existingTask, ...updates }

      vi.mocked(taskApiService.updateTask).mockResolvedValue(
        ApiCallResult.Success(updatedTask, 200)
      )

      const store = useTaskStore()
      store.tasks = [...mockTasks]

      await store.updateTask(existingTask.id, updates)

      expect(taskApiService.updateTask).toHaveBeenCalledWith(existingTask.id, updates)
      expect(store.tasks.find(t => t.id === existingTask.id)?.title).toBe(`Updated Title`)
    })
  })

  describe(`deleteTask`, () => {
    it(`should delete task via API and remove from state`, async () => {
      vi.mocked(taskApiService.deleteTask).mockResolvedValue(
        ApiCallResult.Success(undefined, 204)
      )

      const store = useTaskStore()
      store.tasks = [...mockTasks]
      const taskToDelete = getFirstMockTask()

      await store.deleteTask(taskToDelete.id)

      expect(taskApiService.deleteTask).toHaveBeenCalledWith(taskToDelete.id)
      expect(store.tasks.find(t => t.id === taskToDelete.id)).toBeUndefined()
    })
  })

  describe(`getters`, () => {
    it(`tasksForCurrentProject should filter and sort tasks by projectId`, () => {
      const store = useTaskStore()
      store.tasks = mockTasks

      const result = store.tasksForCurrentProject(`proj-1`)

      expect(result.every(t => t.projectId === `proj-1`)).toBe(true)
      expect(result).toStrictEqual([...result].sort((a, b) => a.order - b.order))
    })

    it(`tasksByStatus should filter tasks by projectId and status`, () => {
      const store = useTaskStore()
      store.tasks = mockTasks

      const result = store.tasksByStatus(`proj-1`, `todo`)

      expect(result.every(t => t.projectId === `proj-1` && t.status === `todo`)).toBe(true)
    })
  })
})
