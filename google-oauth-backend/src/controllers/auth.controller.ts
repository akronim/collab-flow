import { type Request, type Response, type NextFunction } from 'express'
import { exchangeCodeForToken, refreshAccessToken, validateAccessToken } from '../services/auth.service'
import jwtService from '../services/jwt.service'
import tokenStore from '../services/tokenStore.service'
import { AppError } from '../utils/errors'
import { ErrorMessages } from '../constants'
import Logger from '../utils/logger'
import config from '../config'
import ms from 'ms'

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
    // Step 1: Exchange authorization code for Google's tokens
    const googleTokenData = await exchangeCodeForToken(code, codeVerifier)

    // Step 2: Validate the Google access token to get user info
    const userData = await validateAccessToken(googleTokenData.access_token)

    // Step 3: Securely store the Google refresh token and get an internal refresh token
    let internalRefreshToken: string | undefined
    if (googleTokenData.refresh_token) {
      internalRefreshToken = tokenStore.generateAndStore(googleTokenData.refresh_token)
    }

    // Step 4: Generate an internal JWT
    const internalAccessToken = jwtService.sign({
      id: userData.id,
      email: userData.email,
      name: userData.name
    })

    // Step 5: Return the internal tokens to the client
    const expiresIn = config.jwt.expiresIn
    const expiresInMs = ms(expiresIn)
    const expiresAt = Date.now() + expiresInMs

    res.json({
      internal_access_token: internalAccessToken,
      internal_refresh_token: internalRefreshToken,
      expires_in: expiresInMs / 1000,
      expires_at: expiresAt
    })
  } catch (error) {
    next(error)
  }
}

export const handleInternalTokenRefresh = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  Logger.log(`>>>>>>>>>>>>>>> handleInternalTokenRefresh called`)
  const { internal_refresh_token } = req.body

  if (!internal_refresh_token) {
    next(new AppError(ErrorMessages.MISSING_REFRESH_TOKEN, 400))
    return
  }

  try {
    const googleRefreshToken = tokenStore.getGoogleRefreshToken(internal_refresh_token)
    if (!googleRefreshToken) {
      next(new AppError(ErrorMessages.INVALID_REFRESH_TOKEN, 401))
      return
    }

    //
    const newGoogleTokenData = await refreshAccessToken(googleRefreshToken)

    const userData = await validateAccessToken(newGoogleTokenData.access_token)

    const newInternalAccessToken = jwtService.sign({
      id: userData.id,
      email: userData.email,
      name: userData.name
    })

    const newInternalRefreshToken = tokenStore.generateAndStore(
      newGoogleTokenData.refresh_token || googleRefreshToken
    )
    
    tokenStore.deleteToken(internal_refresh_token)

    const expiresIn = config.jwt.expiresIn
    const expiresInMs = ms(expiresIn)
    const expiresAt = Date.now() + expiresInMs

    res.json({
      internal_access_token: newInternalAccessToken,
      internal_refresh_token: newInternalRefreshToken,
      expires_in: expiresInMs / 1000,
      expires_at: expiresAt
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
