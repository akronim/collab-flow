import { describe, it, expect, vi, beforeEach } from 'vitest'
import { projectService } from '@/services/project.service'
import { projectRepository } from '@/repositories/project.repository'
import { type Project } from '@/types/project'

// Mock the repository
vi.mock(`@/repositories/project.repository`)

describe(`Project Service`, () => {
  const mockProject: Project = {
    id: `1`,
    name: `Test Project`,
    description: `A test project`,
    createdAt: new Date().toISOString()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it(`should get all projects from the repository`, async () => {
    const mockProjects = [mockProject]
    vi.mocked(projectRepository.find).mockResolvedValue(mockProjects)

    const projects = await projectService.getAllProjects()

    expect(projectRepository.find).toHaveBeenCalledOnce()
    expect(projects).toEqual(mockProjects)
  })

  it(`should get a project by id from the repository`, async () => {
    vi.mocked(projectRepository.findById).mockResolvedValue(mockProject)

    const project = await projectService.getProjectById(`1`)

    expect(projectRepository.findById).toHaveBeenCalledWith(`1`)
    expect(project).toEqual(mockProject)
  })

  it(`should create a project using the repository`, async () => {
    const newProjectData: Omit<Project, `id` | `createdAt`> = {
      name: `New Project`,
      description: `A new project`
    }
    vi.mocked(projectRepository.create).mockResolvedValue({ id: `2`, ...newProjectData, createdAt: `` })

    const createdProject = await projectService.createProject(newProjectData)

    expect(projectRepository.create).toHaveBeenCalledWith(newProjectData)
    expect(createdProject.id).toBe(`2`)
    expect(createdProject.name).toBe(`New Project`)
  })
})
