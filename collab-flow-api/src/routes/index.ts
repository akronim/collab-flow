import { Router } from 'express'
import taskRoutes from './task.routes'
import projectRoutes from './project.routes'
import userRoutes from './user.routes'
import { checkJwt } from '../middleware/auth.middleware'

const router = Router()

// Protect all routes in this router with the JWT middleware
router.use(checkJwt)

router.use(`/tasks`, taskRoutes)
router.use(`/projects`, projectRoutes)
router.use(`/users`, userRoutes)

export default router
