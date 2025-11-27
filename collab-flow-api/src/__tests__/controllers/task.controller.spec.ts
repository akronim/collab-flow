import { describe, it, expect, vi } from 'vitest'
import request from 'supertest'
import express from 'express'
import taskRoutes from '@/routes/task.routes'
import { taskService } from '@/services/task.service'

// Mock the service
vi.mock(`@/services/task.service`)

const app = express()
app.use(express.json())
app.use(taskRoutes)

describe(`Task Controller`, () => {
  it(`GET / should return all tasks`, async () => {
    const mockTasks = [{ id: `1`, title: `Test Task` }]
    vi.mocked(taskService.getAllTasks).mockResolvedValue(mockTasks as any)

    const res = await request(app).get(`/`)
    expect(res.status).toBe(200)
    expect(res.body).toEqual(mockTasks)
  })

  it(`GET /:id should return a single task`, async () => {
    const mockTask = { id: `1`, title: `Test Task` }
    vi.mocked(taskService.getTaskById).mockResolvedValue(mockTask as any)

    const res = await request(app).get(`/1`)
    expect(res.status).toBe(200)
    expect(res.body).toEqual(mockTask)
  })

  it(`GET /:id should return 404 if task not found`, async () => {
    vi.mocked(taskService.getTaskById).mockResolvedValue(undefined)

    const res = await request(app).get(`/999`)
    expect(res.status).toBe(404)
  })

  it(`POST / should create a new task`, async () => {
    const newTask = { projectId: `1`, title: `New Task`, status: `todo`, order: 1 }
    const createdTask = { id: `3`, ...newTask }
    vi.mocked(taskService.createTask).mockResolvedValue(createdTask as any)

    const res = await request(app).post(`/`).send(newTask)
    expect(res.status).toBe(201)
    expect(res.body).toEqual(createdTask)
  })
})
