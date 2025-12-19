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
    const { projectId } = req.query
    if (!projectId) {
      res.status(400).json({ message: `projectId is required` })
      return
    }
    const task = await taskService.getTaskByProjectAndId(projectId as string, req.params.id)
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
    const { projectId } = req.query
    if (!projectId) {
      res.status(400).json({ message: `projectId is required` })
      return
    }
    const task = await taskService.getTaskByProjectAndId(projectId as string, req.params.id)
    if (!task) {
      res.status(404).json({ message: `Task not found` })
      return
    }
    const updatedTask = await taskService.updateTask(req.params.id, req.body)
    res.status(200).json(updatedTask)
  },

  deleteTask: async (req: Request, res: Response): Promise<void> => {
    const { projectId } = req.query
    if (!projectId) {
      res.status(400).json({ message: `projectId is required` })
      return
    }
    const task = await taskService.getTaskByProjectAndId(projectId as string, req.params.id)
    if (!task) {
      res.status(404).json({ message: `Task not found` })
      return
    }
    await taskService.deleteTask(req.params.id)
    res.status(204).send()
  }
}
