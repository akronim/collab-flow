import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Task } from '@/types/task'
import { v4 as uuidv4 } from 'uuid'

// eslint-disable-next-line max-lines-per-function
export const useTaskStore = defineStore(`tasks`, () => {
  const tasks = ref<Task[]>([
    {
      id: uuidv4(),
      projectId: `1`,
      title: `Design homepage`,
      description: `Create mockups in Figma`,
      status: `todo`,
      order: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: uuidv4(),
      projectId: `1`,
      title: `Setup Vue project`,
      description: `With Vite + Tailwind + Pinia`,
      status: `inprogress`,
      order: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: uuidv4(),
      projectId: `1`,
      title: `User authentication`,
      description: `Implement login flow`,
      status: `done`,
      order: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ])

  const currentProjectId = ref<string | null>(null)

  const setCurrentProject = (projectId: string): void => {
    currentProjectId.value = projectId
  }

  const clearCurrentProject = (): void => {
    currentProjectId.value = null
  }

  const tasksForCurrentProject = computed((): Task[] => {
    if (!currentProjectId.value) {
      return []
    }
    return tasks.value
      .filter(t => t.projectId === currentProjectId.value)
      .sort((a, b) => a.order - b.order)
  })

  const tasksByStatus = computed(() => {
    return (status: Task[`status`]): Task[] => {
      if (!currentProjectId.value) {
        return []
      }
      return tasksForCurrentProject.value
        .filter(t => t.status === status)
        .sort((a, b) => a.order - b.order)
    }
  })

  const addTask = (task: Omit<Task, `id` | `createdAt` | `updatedAt`>): void => {
    const newTask: Task = {
      ...task,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    tasks.value.push(newTask)
  }

  const updateTask = (id: string, updates: Partial<Task>): void => {
    const task = tasks.value.find(t => t.id === id)
    if (task) {
      Object.assign(task, { ...updates, updatedAt: new Date().toISOString() })
    }
  }

  const deleteTask = (id: string): void => {
    tasks.value = tasks.value.filter(t => t.id !== id)
  }

  const moveTask = (taskId: string, newStatus: Task[`status`], newOrder: number): void => {
    updateTask(taskId, { status: newStatus, order: newOrder })
  }

  return {
    tasks,
    currentProjectId,
    setCurrentProject,
    clearCurrentProject,
    tasksForCurrentProject,
    tasksByStatus,
    addTask,
    updateTask,
    deleteTask,
    moveTask
  }
})
