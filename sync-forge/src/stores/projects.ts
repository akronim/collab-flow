import type { Project } from '@/types/project'
import { defineStore } from 'pinia'
import { projectApiService } from '@/services/project.service'
import { showErrorNotification, showSuccessNotification } from '@/utils/notificationHelper'
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

    async addProject(newProject: Omit<Project, `id` | `createdAt` | `taskCount`>): Promise<void> {
      const result = await projectApiService.createProject(newProject)
      if (result.isSuccess()) {
        showSuccessNotification(NotificationMessages.CREATED)
      } else {
        showErrorNotification(result.error, NotificationMessages.SAVE_FAILED)
      }
    },

    async updateProject(id: string, project: Partial<Omit<Project, `id` | `createdAt` | `taskCount`>>): Promise<void> {
      const result = await projectApiService.updateProject(id, project)
      if (result.isSuccess()) {
        showSuccessNotification(NotificationMessages.UPDATED)
      } else {
        showErrorNotification(result.error, NotificationMessages.SAVE_FAILED)
      }
    },

    async deleteProject(id: string): Promise<void> {
      const result = await projectApiService.deleteProject(id)
      if (result.isSuccess()) {
        showSuccessNotification(NotificationMessages.DELETED)
      } else {
        showErrorNotification(result.error, NotificationMessages.DELETE_FAILED)
      }
    }
  }
})
