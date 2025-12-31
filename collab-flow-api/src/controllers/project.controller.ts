import { type Request, type Response } from 'express'
import { projectService } from '../services/project.service'

export const projectController = {
  getProjects: async (req: Request, res: Response): Promise<void> => {
    const projects = await projectService.getAllProjects()
    res.status(200).json(projects)
  },

  getProject: async (req: Request, res: Response): Promise<void> => {
    const project = await projectService.getProjectById(req.params.id)
    if (project) {
      res.status(200).json(project)
    } else {
      res.status(404).json({ message: `Project not found` })
    }
  },

  createProject: async (req: Request, res: Response): Promise<void> => {
    const newProject = await projectService.createProject(req.body)
    res.status(201).json(newProject)
  },

  updateProject: async (req: Request, res: Response): Promise<void> => {
    const updatedProject = await projectService.updateProject(req.params.id, req.body)
    if (updatedProject) {
      res.status(200).json(updatedProject)
    } else {
      res.status(404).json({ message: `Project not found` })
    }
  },

  deleteProject: async (req: Request, res: Response): Promise<void> => {
    const deleted = await projectService.deleteProject(req.params.id)
    if (deleted) {
      res.status(204).send()
    } else {
      res.status(404).json({ message: `Project not found` })
    }
  }
}
