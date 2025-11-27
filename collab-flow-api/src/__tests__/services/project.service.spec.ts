import { describe, it, expect, beforeEach, vi } from 'vitest'
import { projectService } from '@/services/project.service'
import { type Project } from '@/types/project'

let projects: Project[] = []

const resetProjects = (): void => {
  projects = [
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
}

vi.mock(`@/services/project.service`, () => {
  return {
    projectService: {
      getAllProjects: vi.fn(async () => projects),
      getProjectById: vi.fn(async (id: string) => projects.find(p => p.id === id)),
      createProject: vi.fn(async (projectData: Omit<Project, `id` | `createdAt`>) => {
        const newProject: Project = {
          id: String(projects.length + 1),
          ...projectData,
          createdAt: new Date().toISOString()
        }
        projects.push(newProject)
        return newProject
      })
    }
  }
})

describe(`Project Service`, () => {
  beforeEach(() => {
    resetProjects()
    vi.clearAllMocks()
  })

  it(`should return all projects`, async () => {
    const result = await projectService.getAllProjects()
    expect(result).toBeInstanceOf(Array)
    expect(result.length).toBe(2)
  })

  it(`should return a project by id`, async () => {
    const project = await projectService.getProjectById(`1`)
    expect(project).toBeDefined()
    expect(project?.id).toBe(`1`)
  })

  it(`should return undefined for a non-existent project`, async () => {
    const project = await projectService.getProjectById(`999`)
    expect(project).toBeUndefined()
  })

  it(`should create a new project`, async () => {
    const newProjectData: Omit<Project, `id` | `createdAt`> = {
      name: `New Test Project`,
      description: `A project for testing.`
    }
    const createdProject = await projectService.createProject(newProjectData)
    expect(createdProject).toBeDefined()
    expect(createdProject.id).toBe(`3`)
    expect(createdProject.name).toBe(newProjectData.name)

    const allProjects = await projectService.getAllProjects()
    expect(allProjects.length).toBe(3)
  })
})
