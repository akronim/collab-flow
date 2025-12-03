import { Router } from 'express'
import { apiEndpoints } from '../constants'
import { handleTokenRequest, handleInternalTokenRefresh, handleLogout } from '../controllers/auth.controller'

const router = Router()

router.post(apiEndpoints.TOKEN, handleTokenRequest)
router.post(apiEndpoints.INTERNAL_REFRESH, handleInternalTokenRefresh)
router.post(apiEndpoints.LOGOUT, handleLogout)

export default router
