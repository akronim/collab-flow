import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Project {
  id: string
  name: string
  description: string
  createdAt: string
}

export const useProjectStore = defineStore('projects', () => {
  const projects = ref<Project[]>([
    {
      id: '1',
      name: 'Website Redesign',
      description: 'Update marketing site',
      createdAt: new Date().toISOString()
    }
  ])

  return { projects }
})