import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Task {
  id: string
  projectId: string
  title: string
  status: `todo` | `in-progress` | `done`
  createdAt: string
}

export const useTaskStore = defineStore(`tasks`, () => {
  const tasks = ref<Task[]>([
    {
      id: `1`,
      projectId: `1`,
      title: `Design hero`,
      status: `todo`,
      createdAt: new Date().toISOString()
    }
  ])

  return { tasks }
})
