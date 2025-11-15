import { type Request, type Response, type NextFunction } from 'express';
import { exchangeCodeForToken, refreshAccessToken, validateAccessToken } from '../services/auth.service';
import { AppError } from '../utils/errors';
import { ErrorMessages } from '../constants';

export interface TokenRequest {
    code: string;
    codeVerifier: string;
}

export const handleTokenRequest = async (req: Request<{}, {}, TokenRequest>, res: Response, next: NextFunction) => {
    console.log(">>>>>>>>>>>>>>> handleTokenRequest called")

    const { code, codeVerifier } = req.body;

    if (!code || !codeVerifier) {
        return next(new AppError(ErrorMessages.MISSING_CODE_OR_VERIFIER, 400));
    }

    try {
        const tokenData = await exchangeCodeForToken(code, codeVerifier);
        const { expires_in } = tokenData;
        
        res.json({
            ...tokenData,
            expires_at: Date.now() + expires_in * 1000,
        });
    } catch (error) {
        next(error);
    }
};

export const handleTokenRefresh = async (req: Request, res: Response, next: NextFunction) => {
    console.log(">>>>>>>>>>>>>>> handleTokenRefresh called")

    const { refresh_token } = req.body;
    if (!refresh_token) {
        return next(new AppError(ErrorMessages.MISSING_REFRESH_TOKEN, 400));
    }

    try {
        const tokenData = await refreshAccessToken(refresh_token);
        res.json(tokenData);
    } catch (error) {
        next(error);
    }
};

export const handleTokenValidation = async (req: Request, res: Response, next: NextFunction) => {
    console.log(">>>>>>>>>>>>>>> handleTokenValidation called")

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(new AppError(ErrorMessages.MISSING_AUTH_HEADER, 401));
    }

    const accessToken = authHeader.split(' ')[1];

    try {
        const userData = await validateAccessToken(accessToken);
        res.json(userData);
    } catch (error) {
        next(error);
    }
};

