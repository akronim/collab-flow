import { Router } from 'express'
import { apiEndpoints } from '../constants'
import { handleTokenRequest, handleGetCurrentUser, handleLogout } from '../controllers/auth.controller'

const router = Router()

router.post(apiEndpoints.TOKEN, handleTokenRequest)
router.get(apiEndpoints.ME, handleGetCurrentUser)
router.post(apiEndpoints.LOGOUT, handleLogout)

export default router
