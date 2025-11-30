import { Router } from 'express'
import authRoutes from './auth.routes'
import gatewayRouter from './gateway.routes'

const router = Router()

router.use(authRoutes)
router.use(gatewayRouter)

export default router
