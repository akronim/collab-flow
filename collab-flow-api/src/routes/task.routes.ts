import { Router } from 'express'
import { taskController } from '../controllers/task.controller'

const router = Router()

router.get(`/`, taskController.getTasks)
router.get(`/:id`, taskController.getTask)
router.post(`/`, taskController.createTask)
router.put(`/:id`, taskController.updateTask)
router.delete(`/:id`, taskController.deleteTask)

export default router
