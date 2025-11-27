import { describe, it, expect, vi, beforeEach } from 'vitest'
import { userService } from '@/services/user.service'
import { userRepository } from '@/repositories/user.repository'
import { type User } from '@/types/user'

// Mock the repository
vi.mock(`@/repositories/user.repository`)

describe(`User Service`, () => {
  const mockUser: User = {
    id: `1`,
    name: `Test User`,
    email: `test@example.com`,
    role: `member`,
    status: `active`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it(`should get all users from the repository`, async () => {
    const mockUsers = [mockUser]
    vi.mocked(userRepository.find).mockResolvedValue(mockUsers)

    const users = await userService.getAllUsers()

    expect(userRepository.find).toHaveBeenCalledOnce()
    expect(users).toEqual(mockUsers)
  })

  it(`should get a user by id from the repository`, async () => {
    vi.mocked(userRepository.findById).mockResolvedValue(mockUser)

    const user = await userService.getUserById(`1`)

    expect(userRepository.findById).toHaveBeenCalledWith(`1`)
    expect(user).toEqual(mockUser)
  })

  it(`should create a user using the repository`, async () => {
    const newUserData: Omit<User, `id` | `createdAt` | `updatedAt`> = {
      name: `New User`,
      email: `new@example.com`,
      role: `member`,
      status: `active`
    }
    vi.mocked(userRepository.create).mockResolvedValue({ id: `2`, ...newUserData, createdAt: ``, updatedAt: `` })

    const createdUser = await userService.createUser(newUserData)

    expect(userRepository.create).toHaveBeenCalledWith(newUserData)
    expect(createdUser.id).toBe(`2`)
    expect(createdUser.name).toBe(`New User`)
  })
})
