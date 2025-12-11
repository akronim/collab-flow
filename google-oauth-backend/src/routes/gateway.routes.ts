import { Router } from 'express'
import { gatewayProxy } from '../middleware/gateway.middleware'
import { requireSession } from '../middleware/requireSession.middleware'

const router = Router()

/**
 * All requests handled by this router will first pass through the
 * requireSession middleware to ensure a valid session exists.
 * Then, the request is passed to the gatewayProxy to be
 * forwarded to the appropriate downstream service.
 */
router.use(`/`, requireSession, gatewayProxy)

export default router
