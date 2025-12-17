import type { Project } from '@/types/project'
import { defineStore } from 'pinia'
import { projectApiService } from '@/services/project.service'
import { showErrorNotification } from '@/utils/notificationHelper'
import { NotificationMessages } from '@/constants/notificationMessages'

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
        showErrorNotification(result.error, NotificationMessages.FETCH_FAILED)
      }
    },

    async fetchProjectById(id: string): Promise<Project | undefined> {
      const result = await projectApiService.getProjectById(id)
      if (result.isSuccess()) {
        return result.data
      }

      showErrorNotification(result.error, NotificationMessages.FETCH_FAILED)
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
