import type { Project } from '@/types/project'
import { defineStore } from 'pinia'

interface ProjectState {
  projects: Project[]
}

const mockProjects: Project[] = [
  {
    id: `1`,
    name: `Website Redesign`,
    description: `Update marketing site`,
    createdAt: new Date().toISOString()
  }
]

export const useProjectStore = defineStore(`projects`, {
  state: (): ProjectState => ({
    projects: mockProjects
  }),

  getters: {
    getProjectById(): (id: string) => Project | undefined {
      return (id: string) => {
        return this.projects.find((p) => p.id === id)
      }
    }
  },

  actions: {
    fetchProjectById(id: string): Project | undefined {
      return this.projects.find((p) => p.id === id)
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
