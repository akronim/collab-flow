import { Router } from 'express'
import { apiEndpoints } from '../constants'
import { handleTokenRequest, handleTokenRefresh, handleTokenValidation, handleInternalTokenRefresh, handleLogout } from '../controllers/auth.controller'

const router = Router()

router.post(apiEndpoints.TOKEN, handleTokenRequest)
router.post(apiEndpoints.REFRESH, handleTokenRefresh)
router.post(apiEndpoints.INTERNAL_REFRESH, handleInternalTokenRefresh)
router.get(apiEndpoints.VALIDATE, handleTokenValidation)
router.post(apiEndpoints.LOGOUT, handleLogout)

export default router
