import { type Project } from '@/types/project'

const projects: Project[] = [
  {
    id: `1`,
    name: `SyncForge Frontend`,
    description: `The main frontend application for SyncForge.`,
    createdAt: new Date().toISOString()
  },
  {
    id: `2`,
    name: `CollabFlow API`,
    description: `The new backend API for tasks, projects, and users.`,
    createdAt: new Date().toISOString()
  }
]

export const projectService = {
  getAllProjects: async (): Promise<Project[]> => {
    return projects
  },

  getProjectById: async (id: string): Promise<Project | undefined> => {
    return projects.find(project => project.id === id)
  },

  createProject: async (projectData: Omit<Project, `id` | `createdAt`>): Promise<Project> => {
    const newProject: Project = {
      id: String(projects.length + 1),
      ...projectData,
      createdAt: new Date().toISOString()
    }
    projects.push(newProject)
    return newProject
  }
}
