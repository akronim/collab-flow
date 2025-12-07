import { type Request, type Response } from 'express'
import { taskService } from '../services/task.service'

export const taskController = {
  getTasks: async (req: Request, res: Response): Promise<void> => {
    const { projectId } = req.query
    if (typeof projectId === `string`) {
      const tasks = await taskService.getTasksByProjectId(projectId)
      res.status(200).json(tasks)
      return
    }
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
  },

  updateTask: async (req: Request, res: Response): Promise<void> => {
    const updatedTask = await taskService.updateTask(req.params.id, req.body)
    if (updatedTask) {
      res.status(200).json(updatedTask)
    } else {
      res.status(404).json({ message: `Task not found` })
    }
  },

  deleteTask: async (req: Request, res: Response): Promise<void> => {
    const deleted = await taskService.deleteTask(req.params.id)
    if (deleted) {
      res.status(204).send()
    } else {
      res.status(404).json({ message: `Task not found` })
    }
  }
}
