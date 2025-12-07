import type { Project } from '@/types/project'
import { defineStore } from 'pinia'
import { projectApiService } from '@/services/project.service'
import Logger from '@/utils/logger'

interface ProjectState {
  projects: Project[]
}

export const useProjectStore = defineStore(`projects`, {
  state: (): ProjectState => ({
    projects: []
  }),

  getters: {
    getProjectById(): (id: string) => Project | undefined {
      return (id: string) => {
        return this.projects.find((p) => p.id === id)
      }
    }
  },

  actions: {
    async fetchProjects(): Promise<void> {
      const result = await projectApiService.getAllProjects()
      if (result.isSuccess()) {
        this.projects = result.data || []
      } else {
        Logger.apiError(result.error, { message: `Failed to fetch projects` })
      }
    },

    async fetchProjectById(id: string): Promise<Project | undefined> {
      const result = await projectApiService.getProjectById(id)
      if (result.isSuccess()) {
        return result.data
      }

      Logger.apiError(result.error, { message: `Failed to fetch project ${id}` })
      return undefined
    },

    addProject(newProject: Omit<Project, `createdAt`>): void {
      const project: Project = {
        ...newProject,
        createdAt: new Date().toISOString()
      }
      this.projects.push(project)
    }
  }
})
