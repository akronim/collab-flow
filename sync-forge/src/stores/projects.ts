import type { Project } from '@/types/project'
import { defineStore } from 'pinia'
import { projectApiService } from '@/services/project.service'
import ApiCallResult from '@/utils/apiCallResult'

interface ProjectState {
  projects: Project[]
  loading: boolean
  error: unknown | null
}

export const useProjectStore = defineStore(`projects`, {
  state: (): ProjectState => ({
    projects: [],
    loading: false,
    error: null
  }),

  getters: {
    getProjectById: (state) => {
      return (id: string): Project | undefined => {
        return state.projects.find((p) => p.id === id)
      }
    }
  },

  actions: {
    async fetchAllProjects(): Promise<void> {
      this.loading = true
      this.error = null
      const result = await projectApiService.getAllProjects()
      if (result.isSuccess()) {
        this.projects = result.data || []
      } else {
        this.error = result.error
      }
      this.loading = false
    },

    async fetchProjectById(id: string): Promise<Project | undefined> {
      this.loading = true
      this.error = null
      const result = await projectApiService.getProjectById(id)
      if (result.isSuccess()) {
        this.loading = false
        return result.data
      } else {
        this.error = result.error
        this.loading = false
        return undefined
      }
    },

    async addProject(newProject: Omit<Project, `id` | `createdAt`>): Promise<Project | undefined> {
      this.loading = true
      this.error = null
      const result = await projectApiService.createProject(newProject)
      if (result.isSuccess()) {
        if (result.data) {
          this.projects.push(result.data)
        }
        this.loading = false
        return result.data
      } else {
        this.error = result.error
        this.loading = false
        return undefined
      }
    }
  }
})