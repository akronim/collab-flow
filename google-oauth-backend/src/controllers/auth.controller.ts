import { type Request, type Response, type NextFunction } from 'express'
import { exchangeCodeForToken, validateAccessToken } from '../services/auth.service'
import { sessionStore } from '../services/sessionStore.service'
import { AppError } from '../utils/errors'
import { ErrorMessages } from '../constants'
import Logger from '../utils/logger'
import config from '../config'
import { encrypt } from '../utils/encryption'

export interface TokenRequest {
  code: string;
  codeVerifier: string;
}

export const handleTokenRequest = async (
  req: Request<Record<string, never>, Record<string, never>, TokenRequest>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  Logger.log(`[AuthController] Starting token exchange.`)
  const { code, codeVerifier } = req.body

  if (!code || !codeVerifier) {
    return next(new AppError(ErrorMessages.MISSING_CODE_OR_VERIFIER, 400))
  }

  try {
    const googleTokenData = await exchangeCodeForToken(code, codeVerifier)
    const userData = await validateAccessToken(googleTokenData.access_token)

    // Regenerate session to prevent session fixation attacks
    req.session.regenerate(regenerateErr => {
      if (regenerateErr) {
        return next(regenerateErr)
      }

      // Store user data in session
      req.session.userId = userData.id
      req.session.email = userData.email
      req.session.name = userData.name

      // Encrypt and store Google refresh token if it exists
      if (googleTokenData.refresh_token) {
        req.session.encryptedGoogleRefreshToken = encrypt(
          googleTokenData.refresh_token,
          config.encryption.key
        )
      }

      // Save the session before responding
      req.session.save(saveErr => {
        if (saveErr) {
          return next(saveErr)
        }
        Logger.log(`[AuthController] Token exchange successful, session saved.`)
        return res.status(200).json({ success: true })
      })
      return undefined
    })
  } catch (error) {
    next(error)
  }
  return undefined
}

export const handleGetCurrentUser = (req: Request, res: Response, next: NextFunction): void => {
  Logger.log(`[AuthController] handleGetCurrentUser called.`)
  if (!req.session?.userId) {
    Logger.warn(`[AuthController] handleGetCurrentUser failed: No user ID in session.`)
    return next(new AppError(ErrorMessages.UNAUTHORIZED, 401))
  }

  res.json({
    id: req.session.userId,
    email: req.session.email,
    name: req.session.name
  })
  return undefined
}

export const handleLogout = (req: Request, res: Response, next: NextFunction): void => {
  const userId = req.session.userId

  if (userId) {
    // Destroy all sessions for this user (logout from all devices)
    sessionStore.destroyAllByUserId(userId, destroyAllErr => {
      if (destroyAllErr) {
        Logger.error(`Error destroying all sessions for user ${userId}`, destroyAllErr)
        // Non-fatal, proceed with logging out the current session
      }
    })
  }

  // Destroy the current session
  req.session.destroy(destroyErr => {
    if (destroyErr) {
      return next(new AppError(ErrorMessages.LOGOUT_FAILED, 500))
    }
    // The session cookie will be cleared by express-session's destroy method
    res.status(204).send()
    return undefined
  })
}
