import { type Project } from '../types/project'
import { projects, tasks } from '../data/mockData'
import { randomUUID } from 'crypto'

export const projectRepository = {
  find: async (): Promise<Project[]> => {
    return projects.map(p => ({
      ...p,
      taskCount: tasks.filter(t => t.projectId === p.id).length
    }))
  },

  findById: async (id: string): Promise<Project | undefined> => {
    const project = projects.find(p => p.id === id)
    if (project) {
      return {
        ...project,
        taskCount: tasks.filter(t => t.projectId === project.id).length
      }
    }
    return undefined
  },

  create: async (projectData: Omit<Project, `id` | `createdAt` | `taskCount`>): Promise<Project> => {
    const newProject: Project = {
      id: randomUUID(),
      ...projectData,
      createdAt: new Date().toISOString(),
      taskCount: 0
    }
    projects.push(newProject)
    return newProject
  }
}
