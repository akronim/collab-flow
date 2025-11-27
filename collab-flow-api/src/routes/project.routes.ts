import { Router } from 'express'
import { projectController } from '../controllers/project.controller'

const router = Router()

router.get(`/`, projectController.getProjects)
router.get(`/:id`, projectController.getProject)
router.post(`/`, projectController.createProject)

export default router
