import { type Request, type Response } from 'express'
import { taskService } from '@/services/task.service'

export const taskController = {
  getTasks: async (req: Request, res: Response): Promise<void> => {
    const tasks = await taskService.getAllTasks()
    res.status(200).json(tasks)
  },

  getTask: async (req: Request, res: Response): Promise<void> => {
    const task = await taskService.getTaskById(req.params.id)
    if (task) {
      res.status(200).json(task)
    } else {
      res.status(404).json({ message: `Task not found` })
    }
  },

  createTask: async (req: Request, res: Response): Promise<void> => {
    const newTask = await taskService.createTask(req.body)
    res.status(201).json(newTask)
  }
}
