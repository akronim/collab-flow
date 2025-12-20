import { type Project, type ProjectRow } from '../types/project'
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

  create: async (projectData: Omit<ProjectRow, `id` | `createdAt` | `updatedAt`>): Promise<Project> => {
    const now = new Date().toISOString()
    const newProject: ProjectRow = {
      id: randomUUID(),
      ...projectData,
      createdAt: now,
      updatedAt: now
    }
    projects.push(newProject)
    return {
      ...newProject,
      taskCount: 0
    }
  },

  update: async (id: string, projectData: Partial<Omit<ProjectRow, `id` | `createdAt` | `updatedAt`>>): Promise<Project | undefined> => {
    const projectIndex = projects.findIndex(p => p.id === id)
    if (projectIndex === -1) {
      return undefined
    }
    const project = projects[projectIndex]
    if (!project) {
      return undefined
    }
    const updatedProject: ProjectRow = {
      ...project,
      ...projectData,
      updatedAt: new Date().toISOString()
    }
    projects[projectIndex] = updatedProject
    return {
      ...updatedProject,
      taskCount: tasks.filter(t => t.projectId === id).length
    }
  },

  remove: async (id: string): Promise<void> => {
    const projectIndex = projects.findIndex(p => p.id === id)
    if (projectIndex !== -1) {
      projects.splice(projectIndex, 1)
    }
  }
}
