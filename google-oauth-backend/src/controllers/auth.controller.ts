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
    // exchange authorization code for Google's tokens
    const googleTokenData = await exchangeCodeForToken(code, codeVerifier)

    // validate the Google access token to get user info
    const userData = await validateAccessToken(googleTokenData.access_token)

    // securely store the Google refresh token and get an internal refresh token
    let internalRefreshToken: string | undefined
    if (googleTokenData.refresh_token) {
      internalRefreshToken = tokenStore.generateAndStore(googleTokenData.refresh_token)
    }

    // generate an internal JWT
    const internalAccessToken = jwtService.sign({
      id: userData.id,
      email: userData.email,
      name: userData.name
    })

    // return the internal tokens to the client
    const expiresIn = config.jwt.expiresIn
    const expiresInMs = ms(expiresIn)
    const expiresAt = Date.now() + expiresInMs

    if (internalRefreshToken) {
      res.cookie(`internal_refresh_token`, internalRefreshToken, {
        httpOnly: true,
        secure: config.nodeEnv === `production`,
        sameSite: `strict`,
        maxAge: ms(`30d`)
      })
    }

    res.json({
      internal_access_token: internalAccessToken,
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
  const { internal_refresh_token } = req.cookies

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

    res.cookie(`internal_refresh_token`, newInternalRefreshToken, {
      httpOnly: true,
      secure: config.nodeEnv === `production`,
      sameSite: `strict`,
      maxAge: ms(`30d`)
    })

    res.json({
      internal_access_token: newInternalAccessToken,
      expires_in: expiresInMs / 1000,
      expires_at: expiresAt
    })
  } catch (error) {
    next(error)
  }
}

export const handleLogout = async (req: Request, res: Response): Promise<void> => {
  const { internal_refresh_token } = req.cookies

  if (internal_refresh_token) {
    tokenStore.deleteToken(internal_refresh_token)
  }

  res.cookie(`internal_refresh_token`, ``, {
    httpOnly: true,
    secure: config.nodeEnv === `production`,
    sameSite: `strict`,
    maxAge: 0
  })

  res.status(204).send()
}
