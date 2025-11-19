import { type Request, type Response, type NextFunction } from 'express'
import { exchangeCodeForToken, refreshAccessToken, validateAccessToken } from '../services/auth.service'
import { AppError } from '../utils/errors'
import { ErrorMessages } from '../constants'
import Logger from '../utils/logger'

export interface TokenRequest {
  code: string;
  codeVerifier: string;
}

export const handleTokenRequest = async (
  req: Request<Record<string, never>, Record<string, never>, TokenRequest>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  Logger.log(`>>>>>>>>>>>>>>> handleTokenRequest called`)
  const { code, codeVerifier } = req.body

  if (!code || !codeVerifier) {
    next(new AppError(ErrorMessages.MISSING_CODE_OR_VERIFIER, 400))
    return
  }

  try {
    const tokenData = await exchangeCodeForToken(code, codeVerifier)
    const { expires_in } = tokenData

    res.json({
      ...tokenData,
      expires_at: Date.now() + expires_in * 1000
    })
  } catch (error) {
    next(error)
  }
}

export const handleTokenRefresh = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  Logger.log(`>>>>>>>>>>>>>>> handleTokenRefresh called`)
  const { refresh_token } = req.body

  if (!refresh_token) {
    next(new AppError(ErrorMessages.MISSING_REFRESH_TOKEN, 400))
    return
  }

  try {
    const tokenData = await refreshAccessToken(refresh_token)
    res.json(tokenData)
  } catch (error) {
    next(error)
  }
}

export const handleTokenValidation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  Logger.log(`>>>>>>>>>>>>>>> handleTokenValidation called`)
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith(`Bearer `)) {
    next(new AppError(ErrorMessages.MISSING_AUTH_HEADER, 401))
    return
  }

  const accessToken = authHeader.split(` `)[1]

  try {
    const userData = await validateAccessToken(accessToken)
    res.json(userData)
  } catch (error) {
    next(error)
  }
}
