import { Router } from 'express'
import taskRoutes from './task.routes'
import projectRoutes from './project.routes'
import userRoutes from './user.routes'

const router = Router()

router.use(`/tasks`, taskRoutes)
router.use(`/projects`, projectRoutes)
router.use(`/users`, userRoutes)

export default router
