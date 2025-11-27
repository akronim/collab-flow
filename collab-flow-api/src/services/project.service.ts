import { type Project } from '@/types/project'
import { projectRepository } from '@/repositories/project.repository'

export const projectService = {
  getAllProjects: async (): Promise<Project[]> => {
    return await projectRepository.find()
  },

  getProjectById: async (id: string): Promise<Project | undefined> => {
    return await projectRepository.findById(id)
  },

  createProject: async (projectData: Omit<Project, `id` | `createdAt`>): Promise<Project> => {
    return await projectRepository.create(projectData)
  }
}
