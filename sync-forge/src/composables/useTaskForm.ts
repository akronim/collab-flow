import { ref, computed, type Ref } from 'vue'
import { useRouter } from 'vue-router'
import { useTaskStore } from '@/stores'
import type { TaskStatus } from '@/types/task'
import Logger from '@/utils/logger'
import { RouteNames } from '@/constants/routes'

interface TaskFormData {
  title: string
  description: string
}

interface UseTaskFormOptions {
  projectId: Ref<string>
  taskId?: Ref<string | undefined>
  status?: Ref<TaskStatus | undefined>
  onSuccess?: () => void
  onError?: (error: Error) => void
}

interface UseTaskFormReturn {
  form: Ref<TaskFormData>
  isLoading: Ref<boolean>
  error: Ref<string | null>
  isEditMode: Ref<boolean>
  titleExists: Ref<boolean>
  loadTask: () => Promise<boolean>
  saveTask: () => Promise<boolean>
  cancel: () => Promise<void>
  resetForm: () => void
}

/* eslint-disable max-lines-per-function */ 
export function useTaskForm(options: UseTaskFormOptions): UseTaskFormReturn {
  const { projectId, taskId, status, onSuccess, onError } = options

  const router = useRouter()
  const taskStore = useTaskStore()

  const form = ref<TaskFormData>({
    title: ``,
    description: ``
  })
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const isEditMode = computed(() => !!taskId?.value)
  const titleExists = computed(() => form.value.title.trim().length > 0)

  const cancel = async (): Promise<void> => {
    await router.push({
      name: RouteNames.PROJECT_BOARD,
      params: { projectId: projectId.value }
    })
  }

  // eslint-disable-next-line complexity
  const loadTask = async (): Promise<boolean> => {
    if (!isEditMode.value || !taskId?.value) {
      return true
    }

    isLoading.value = true
    error.value = null

    try {
      const task = taskStore.getTaskById(projectId.value, taskId.value)

      if (!task) {
        const errorMsg = `Task not found: ${taskId.value}`
        Logger.error(errorMsg)
        error.value = errorMsg

        onError?.(new Error(errorMsg))

        await cancel()

        return false
      }

      form.value = {
        title: task.title,
        description: task.description ?? ``
      }

      return true
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : `Failed to load task`
      Logger.error(`Error loading task:`, err)
      error.value = errorMsg
      onError?.(err instanceof Error ? err : new Error(errorMsg))
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function handleTaskSave(): Promise<void> {
    const trimmedTitle = form.value.title.trim()
    const trimmedDescription = form.value.description.trim()

    if (isEditMode.value && taskId?.value) {
      await taskStore.updateTask(taskId.value, {
        title: trimmedTitle,
        description: trimmedDescription
      })
    } else {
      const targetStatus = status?.value ?? `todo`
      await taskStore.addTask({
        projectId: projectId.value,
        title: trimmedTitle,
        description: trimmedDescription,
        status: targetStatus,
        order: taskStore.tasksByStatus(projectId.value, targetStatus).length
      })
    }
  }

  const saveTask = async (): Promise<boolean> => {
    if (!projectId.value) {
      const errorMsg = `No current project set`
      Logger.error(errorMsg)
      error.value = errorMsg
      return false
    }

    if (!titleExists.value) {
      error.value = `Title is required`
      return false
    }

    isLoading.value = true
    error.value = null

    try {
      await handleTaskSave()

      onSuccess?.()

      await cancel()

      return true
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : `Failed to save task`
      Logger.error(`Error saving task:`, err)
      error.value = errorMsg
      onError?.(err instanceof Error ? err : new Error(errorMsg))
      return false
    } finally {
      isLoading.value = false
    }
  }

  const resetForm = (): void => {
    form.value = {
      title: ``,
      description: ``
    }
    error.value = null
  }

  return {
    form,
    isLoading,
    error,
    isEditMode,
    titleExists,
    loadTask,
    saveTask,
    cancel,
    resetForm
  }
}
