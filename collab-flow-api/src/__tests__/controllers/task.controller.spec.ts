import { describe, it, expect, vi, beforeEach } from 'vitest'
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
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe(`GET /`, () => {
    it(`should return all tasks`, async () => {
      const mockTasks = [{ id: `1`, title: `Test Task` }]
      vi.mocked(taskService.getAllTasks).mockResolvedValue(mockTasks as any)

      const res = await request(app).get(`/`)

      expect(res.status).toBe(200)
      expect(res.body).toEqual(mockTasks)
    })

    it(`should return tasks filtered by projectId query param`, async () => {
      const mockTasks = [{ id: `1`, title: `Test Task`, projectId: `proj-1` }]
      vi.mocked(taskService.getTasksByProjectId).mockResolvedValue(mockTasks as any)

      const res = await request(app).get(`/?projectId=proj-1`)

      expect(res.status).toBe(200)
      expect(taskService.getTasksByProjectId).toHaveBeenCalledWith(`proj-1`)
      expect(res.body).toEqual(mockTasks)
    })
  })

  describe(`GET /:id`, () => {
    it(`should return a single task`, async () => {
      const mockTask = { id: `1`, title: `Test Task`, projectId: `proj-1` }
      vi.mocked(taskService.getTaskByProjectAndId).mockResolvedValue(mockTask as any)

      const res = await request(app).get(`/1?projectId=proj-1`)

      expect(res.status).toBe(200)
      expect(taskService.getTaskByProjectAndId).toHaveBeenCalledWith(`proj-1`, `1`)
      expect(res.body).toEqual(mockTask)
    })

    it(`should return 400 if projectId is missing`, async () => {
      const res = await request(app).get(`/1`)

      expect(res.status).toBe(400)
    })

    it(`should return 404 if task not found`, async () => {
      vi.mocked(taskService.getTaskByProjectAndId).mockResolvedValue(undefined)

      const res = await request(app).get(`/999?projectId=proj-1`)

      expect(res.status).toBe(404)
    })
  })

  describe(`POST /`, () => {
    it(`should create a new task`, async () => {
      const newTask = { projectId: `1`, title: `New Task`, status: `todo`, order: 1 }
      const createdTask = { id: `3`, ...newTask }
      vi.mocked(taskService.createTask).mockResolvedValue(createdTask as any)

      const res = await request(app).post(`/`).send(newTask)

      expect(res.status).toBe(201)
      expect(res.body).toEqual(createdTask)
    })
  })

  describe(`PUT /:id`, () => {
    it(`should update an existing task`, async () => {
      const existingTask = { id: `1`, title: `Test Task`, projectId: `proj-1` }
      const updates = { title: `Updated Task` }
      const updatedTask = { ...existingTask, ...updates }
      vi.mocked(taskService.getTaskByProjectAndId).mockResolvedValue(existingTask as any)
      vi.mocked(taskService.updateTask).mockResolvedValue(updatedTask as any)

      const res = await request(app).put(`/1?projectId=proj-1`).send(updates)

      expect(res.status).toBe(200)
      expect(taskService.getTaskByProjectAndId).toHaveBeenCalledWith(`proj-1`, `1`)
      expect(taskService.updateTask).toHaveBeenCalledWith(`1`, updates)
      expect(res.body).toEqual(updatedTask)
    })

    it(`should return 400 if projectId is missing`, async () => {
      const res = await request(app).put(`/1`).send({ title: `Test` })

      expect(res.status).toBe(400)
    })

    it(`should return 404 if task not found`, async () => {
      vi.mocked(taskService.getTaskByProjectAndId).mockResolvedValue(undefined)

      const res = await request(app).put(`/999?projectId=proj-1`).send({ title: `Test` })

      expect(res.status).toBe(404)
    })
  })

  describe(`DELETE /:id`, () => {
    it(`should delete an existing task`, async () => {
      const existingTask = { id: `1`, title: `Test Task`, projectId: `proj-1` }
      vi.mocked(taskService.getTaskByProjectAndId).mockResolvedValue(existingTask as any)
      vi.mocked(taskService.deleteTask).mockResolvedValue(true)

      const res = await request(app).delete(`/1?projectId=proj-1`)

      expect(res.status).toBe(204)
      expect(taskService.getTaskByProjectAndId).toHaveBeenCalledWith(`proj-1`, `1`)
      expect(taskService.deleteTask).toHaveBeenCalledWith(`1`)
    })

    it(`should return 400 if projectId is missing`, async () => {
      const res = await request(app).delete(`/1`)

      expect(res.status).toBe(400)
    })

    it(`should return 404 if task not found`, async () => {
      vi.mocked(taskService.getTaskByProjectAndId).mockResolvedValue(undefined)

      const res = await request(app).delete(`/999?projectId=proj-1`)

      expect(res.status).toBe(404)
    })
  })
})
