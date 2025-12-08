import { Router } from 'express'
import { gatewayProxy } from '../middleware/gateway.middleware'
import { tokenValidationMiddleware } from '../middleware/tokenValidation.middleware'

const router = Router()

/**
 * All requests handled by this router will first pass through the
 * tokenValidationMiddleware to validate the internal JWT.
 * Then, the request is passed to the gatewayProxy to be
 * forwarded to the appropriate downstream service.
 */
router.use(`/`, tokenValidationMiddleware, gatewayProxy)

export default router
