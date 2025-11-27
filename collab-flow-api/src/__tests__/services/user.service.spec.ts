import { describe, it, expect, beforeEach, vi } from 'vitest'
import { userService } from '@/services/user.service'
import { type User, type UserRole, type UserStatus } from '@/types/user'

let users: User[] = []

const resetUsers = (): void => {
  users = [
    {
      id: `1`,
      name: `John Doe`,
      email: `john.doe@example.com`,
      role: `admin` as UserRole,
      title: `Project Manager`,
      status: `active` as UserStatus,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: `2`,
      name: `Jane Smith`,
      email: `jane.smith@example.com`,
      role: `member` as UserRole,
      title: `Software Engineer`,
      status: `active` as UserStatus,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ]
}

vi.mock(`@/services/user.service`, () => {
  return {
    userService: {
      getAllUsers: vi.fn(async () => users),
      getUserById: vi.fn(async (id: string) => users.find(u => u.id === id)),
      createUser: vi.fn(async (userData: Omit<User, `id` | `createdAt` | `updatedAt`>) => {
        const newUser: User = {
          id: String(users.length + 1),
          ...userData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        users.push(newUser)
        return newUser
      })
    }
  }
})

describe(`User Service`, () => {
  beforeEach(() => {
    resetUsers()
    vi.clearAllMocks()
  })

  it(`should return all users`, async () => {
    const result = await userService.getAllUsers()
    expect(result).toBeInstanceOf(Array)
    expect(result.length).toBe(2)
  })

  it(`should return a user by id`, async () => {
    const user = await userService.getUserById(`1`)
    expect(user).toBeDefined()
    expect(user?.id).toBe(`1`)
  })

  it(`should return undefined for a non-existent user`, async () => {
    const user = await userService.getUserById(`999`)
    expect(user).toBeUndefined()
  })

  it(`should create a new user`, async () => {
    const newUserData: Omit<User, `id` | `createdAt` | `updatedAt`> = {
      name: `Test User`,
      email: `test@example.com`,
      role: `member`,
      status: `active`
    }
    const createdUser = await userService.createUser(newUserData)
    expect(createdUser).toBeDefined()
    expect(createdUser.id).toBe(`3`)
    expect(createdUser.name).toBe(newUserData.name)

    const allUsers = await userService.getAllUsers()
    expect(allUsers.length).toBe(3)
  })
})
