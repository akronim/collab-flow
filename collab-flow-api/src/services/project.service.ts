import { type Project } from '../types/project'
import { projectRepository } from '../repositories/project.repository'

export const projectService = {
  getAllProjects: async (): Promise<Project[]> => {
    return await projectRepository.find()
  },

  getProjectById: async (id: string): Promise<Project | undefined> => {
    return await projectRepository.findById(id)
  },

  createProject: async (projectData: Omit<Project, `id` | `createdAt` | `taskCount`>): Promise<Project> => {
    return await projectRepository.create(projectData)
  },

  updateProject: async (id: string, projectData: Partial<Omit<Project, `id` | `createdAt` | `taskCount`>>): Promise<Project | undefined> => {
    return await projectRepository.update(id, projectData)
  },

  deleteProject: async (id: string): Promise<void> => {
    await projectRepository.remove(id)
  }
}
