import { Router } from 'express'
import { taskController } from '@/controllers/task.controller'

const router = Router()

router.get(`/`, taskController.getTasks)
router.get(`/:id`, taskController.getTask)
router.post(`/`, taskController.createTask)

export default router
