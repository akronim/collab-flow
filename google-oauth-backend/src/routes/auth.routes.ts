import { Router } from 'express';
import { apiEndpoints } from '../constants';
import { handleTokenRequest, handleTokenRefresh, handleTokenValidation } from '../controllers/auth.controller';

const router = Router();

router.post(apiEndpoints.TOKEN, handleTokenRequest);
router.post(apiEndpoints.REFRESH, handleTokenRefresh);
router.get(apiEndpoints.VALIDATE, handleTokenValidation);

export default router;