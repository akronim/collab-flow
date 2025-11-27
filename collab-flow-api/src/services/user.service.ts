import { type User } from '../types/user'
import { userRepository } from '../repositories/user.repository'

export const userService = {
  getAllUsers: async (): Promise<User[]> => {
    return await userRepository.find()
  },

  getUserById: async (id: string): Promise<User | undefined> => {
    return await userRepository.findById(id)
  },

  createUser: async (userData: Omit<User, `id` | `createdAt` | `updatedAt`>): Promise<User> => {
    return await userRepository.create(userData)
  }
}
