import { type Request, type Response } from 'express'
import { userService } from '@/services/user.service'

export const userController = {
  getUsers: async (req: Request, res: Response): Promise<void> => {
    const users = await userService.getAllUsers()
    res.status(200).json(users)
  },

  getUser: async (req: Request, res: Response): Promise<void> => {
    const user = await userService.getUserById(req.params.id)
    if (user) {
      res.status(200).json(user)
    } else {
      res.status(404).json({ message: `User not found` })
    }
  },

  createUser: async (req: Request, res: Response): Promise<void> => {
    const newUser = await userService.createUser(req.body)
    res.status(201).json(newUser)
  }
}
