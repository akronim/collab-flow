import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import userRoutes from '@/routes/user.routes'
import { userService } from '@/services/user.service'

// Mock the service
vi.mock(`@/services/user.service`)

const app = express()
app.use(express.json())
app.use(userRoutes)

describe(`User Controller`, () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it(`GET / should return all users`, async () => {
    const mockUsers = [{ id: `1`, name: `Test User` }]
    vi.mocked(userService.getAllUsers).mockResolvedValue(mockUsers as any)

    const res = await request(app).get(`/`)
    expect(res.status).toBe(200)
    expect(res.body).toEqual(mockUsers)
  })

  it(`GET /:id should return a single user`, async () => {
    const mockUser = { id: `1`, name: `Test User` }
    vi.mocked(userService.getUserById).mockResolvedValue(mockUser as any)

    const res = await request(app).get(`/1`)
    expect(res.status).toBe(200)
    expect(res.body).toEqual(mockUser)
  })

  it(`GET /:id should return 404 if user not found`, async () => {
    vi.mocked(userService.getUserById).mockResolvedValue(undefined)

    const res = await request(app).get(`/999`)
    expect(res.status).toBe(404)
  })

  it(`POST / should create a new user`, async () => {
    const newUser = { name: `New User`, email: `new@example.com`, role: `member`, status: `active` }
    const createdUser = { id: `3`, ...newUser }
    vi.mocked(userService.createUser).mockResolvedValue(createdUser as any)

    const res = await request(app).post(`/`).send(newUser)
    expect(res.status).toBe(201)
    expect(res.body).toEqual(createdUser)
  })
})
