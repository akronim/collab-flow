import { Router } from 'express'
import { apiEndpoints } from '../constants'
import {
  handleTokenRequest,
  handleGetCurrentUser,
  handleLogout,
  handleGetInternalToken
} from '../controllers/auth.controller'
import { requireSession } from '../middleware/requireSession.middleware'

const router = Router()

router.post(apiEndpoints.TOKEN, handleTokenRequest)
router.get(apiEndpoints.ME, handleGetCurrentUser)
router.post(apiEndpoints.LOGOUT, handleLogout)
router.get(apiEndpoints.INTERNAL_TOKEN, requireSession, handleGetInternalToken)

export default router
