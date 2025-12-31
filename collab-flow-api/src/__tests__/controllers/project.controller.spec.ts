import { describe, it, expect, vi } from 'vitest'
import request from 'supertest'
import express from 'express'
import projectRoutes from '@/routes/project.routes'
import { projectService } from '@/services/project.service'

// Mock the service
vi.mock(`@/services/project.service`)

const app = express()
app.use(express.json())
app.use(projectRoutes)

describe(`Project Controller`, () => {
  it(`GET / should return all projects`, async () => {
    const mockProjects = [{ id: `1`, name: `Test Project` }]
    vi.mocked(projectService.getAllProjects).mockResolvedValue(mockProjects as any)

    const res = await request(app).get(`/`)
    expect(res.status).toBe(200)
    expect(res.body).toEqual(mockProjects)
  })

  it(`GET /:id should return a single project`, async () => {
    const mockProject = { id: `1`, name: `Test Project` }
    vi.mocked(projectService.getProjectById).mockResolvedValue(mockProject as any)

    const res = await request(app).get(`/1`)
    expect(res.status).toBe(200)
    expect(res.body).toEqual(mockProject)
  })

  it(`GET /:id should return 404 if project not found`, async () => {
    vi.mocked(projectService.getProjectById).mockResolvedValue(undefined)

    const res = await request(app).get(`/999`)
    expect(res.status).toBe(404)
  })

  it(`POST / should create a new project`, async () => {
    const newProject = { name: `New Project`, description: `A cool project` }
    const createdProject = { id: `3`, ...newProject }
    vi.mocked(projectService.createProject).mockResolvedValue(createdProject as any)

    const res = await request(app).post(`/`).send(newProject)
    expect(res.status).toBe(201)
    expect(res.body).toEqual(createdProject)
  })

  it(`PUT /:id should update a project`, async () => {
    const updatedProject = { id: `1`, name: `Updated Project` }
    vi.mocked(projectService.updateProject).mockResolvedValue(updatedProject as any)

    const res = await request(app).put(`/1`).send({ name: `Updated Project` })
    expect(res.status).toBe(200)
    expect(res.body).toEqual(updatedProject)
  })

  it(`PUT /:id should return 404 if project to update not found`, async () => {
    vi.mocked(projectService.updateProject).mockResolvedValue(undefined)

    const res = await request(app).put(`/999`).send({ name: `Updated Project` })
    expect(res.status).toBe(404)
  })

  it(`DELETE /:id should delete a project`, async () => {
    vi.mocked(projectService.deleteProject).mockResolvedValue(true)

    const res = await request(app).delete(`/1`)
    expect(res.status).toBe(204)
  })

  it(`DELETE /:id should return 404 if project not found`, async () => {
    vi.mocked(projectService.deleteProject).mockResolvedValue(false)

    const res = await request(app).delete(`/999`)
    expect(res.status).toBe(404)
  })
})
