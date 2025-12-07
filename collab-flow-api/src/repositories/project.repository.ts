import { type Project } from '../types/project'
import { projects } from '../data/mockData'
import { randomUUID } from 'crypto'

export const projectRepository = {
  find: async (): Promise<Project[]> => {
    return projects
  },

  findById: async (id: string): Promise<Project | undefined> => {
    return projects.find(project => project.id === id)
  },

  create: async (projectData: Omit<Project, `id` | `createdAt`>): Promise<Project> => {
    const newProject: Project = {
      id: randomUUID(),
      ...projectData,
      createdAt: new Date().toISOString()
    }
    projects.push(newProject)
    return newProject
  }
}
