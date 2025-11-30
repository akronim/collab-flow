import { Router } from 'express'
import { gatewayProxy } from '../middleware/gateway.middleware'
import { tokenSwapMiddleware } from '../middleware/tokenSwap.middleware'

const router = Router()

/**
 * All requests handled by this router will first pass through the
 * tokenSwapMiddleware to validate the Google token and swap it for an
 * internal JWT. Then, the request is passed to the gatewayProxy to be
 * forwarded to the appropriate downstream service.
 */
router.use(`/`, tokenSwapMiddleware, gatewayProxy)

export default router
