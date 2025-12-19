import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { useTaskForm } from '@/composables/useTaskForm'
import { useProjectTaskStore } from '@/stores'
import type { Task } from '@/types/task'

const mockRouterPush = vi.fn()

vi.mock(`vue-router`, () => ({
  useRouter: (): { push: typeof mockRouterPush } => ({
    push: mockRouterPush
  })
}))

vi.mock(`@/utils/notificationHelper`, () => ({
  showErrorNotification: vi.fn(),
  showSuccessNotification: vi.fn()
}))

import { showErrorNotification } from '@/utils/notificationHelper'

const createMockTask = (overrides: Partial<Task> = {}): Task => ({
  id: `task-1`,
  projectId: `proj-1`,
  title: `Test Task`,
  description: `Test description`,
  status: `todo`,
  order: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides
})

describe(`useTaskForm`, () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe(`loadTask`, () => {
    it(`should load task data in edit mode`, async () => {
      const store = useProjectTaskStore()
      const mockTask = createMockTask()
      vi.spyOn(store, `getTaskById`).mockResolvedValue(mockTask)

      const { loadTask, form } = useTaskForm({
        projectId: ref(`proj-1`),
        taskId: ref(`task-1`)
      })

      const result = await loadTask()

      expect(result).toBe(true)
      expect(form.value.title).toBe(mockTask.title)
      expect(form.value.description).toBe(mockTask.description)
    })

    it(`should return true immediately in create mode`, async () => {
      const { loadTask } = useTaskForm({
        projectId: ref(`proj-1`),
        taskId: ref(undefined)
      })

      const result = await loadTask()

      expect(result).toBe(true)
    })

    it(`should show error and redirect when task not found`, async () => {
      const store = useProjectTaskStore()
      vi.spyOn(store, `getTaskById`).mockResolvedValue(undefined)

      const { loadTask } = useTaskForm({
        projectId: ref(`proj-1`),
        taskId: ref(`non-existent-task`)
      })

      const result = await loadTask()

      expect(result).toBe(false)
      expect(showErrorNotification).toHaveBeenCalled()
      expect(mockRouterPush).toHaveBeenCalled()
    })

    it(`should show error and redirect when task does not belong to project`, async () => {
      const store = useProjectTaskStore()
      // BE now returns undefined when task doesn't belong to project
      vi.spyOn(store, `getTaskById`).mockResolvedValue(undefined)

      const { loadTask } = useTaskForm({
        projectId: ref(`proj-2`),
        taskId: ref(`task-1`)
      })

      const result = await loadTask()

      expect(result).toBe(false)
      expect(showErrorNotification).toHaveBeenCalledWith(null, `Task not found`)
      expect(mockRouterPush).toHaveBeenCalled()
    })
  })
})
