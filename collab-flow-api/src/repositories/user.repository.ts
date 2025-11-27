import { type User, type UserRole, type UserStatus } from '../types/user'

const users: User[] = [
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

export const userRepository = {
  find: async (): Promise<User[]> => {
    return users
  },

  findById: async (id: string): Promise<User | undefined> => {
    return users.find(user => user.id === id)
  },

  create: async (userData: Omit<User, `id` | `createdAt` | `updatedAt`>): Promise<User> => {
    const newUser: User = {
      id: String(users.length + 1),
      ...userData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    users.push(newUser)
    return newUser
  }
}
