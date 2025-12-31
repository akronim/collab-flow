import { type Request, type Response, type NextFunction } from 'express'
import { exchangeCodeForToken, validateAccessToken, generateInternalToken } from '../services/auth.service'
import { findOrCreateUser } from '../services/user.service'
import { sessionStore } from '../middleware/session.middleware'
import { AppError } from '../utils/errors'
import { CSRF_COOKIE_NAME, ErrorMessages, SESSION_COOKIE_NAME } from '../constants'
import Logger from '../utils/logger'
import config from '../config'
import { encrypt } from '../utils/encryption'
import { generateCsrfToken } from '../utils/csrfToken'
import type { CollabFlowUser, TokenResponse } from '../types'

export interface TokenRequest {
  code: string;
  codeVerifier: string;
}

function setNewCsrfCookie(res: Response): void {
  const newCsrfToken = generateCsrfToken()
  res.cookie(CSRF_COOKIE_NAME, newCsrfToken, {
    httpOnly: false,
    secure: config.nodeEnv === `production`,
    sameSite: `lax`
  })
}

function populateSession(
  req: Request,
  user: CollabFlowUser,
  googleTokenData: TokenResponse
): void {
  req.session.userId = user.id
  req.session.email = user.email
  req.session.name = user.name

  if (googleTokenData.refresh_token) {
    req.session.encryptedGoogleRefreshToken = encrypt(
      googleTokenData.refresh_token,
      config.encryption.key
    )
  }
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
    const googleUserData = await validateAccessToken(googleTokenData.access_token)
    const collabFlowUser = await findOrCreateUser({
      googleUserId: googleUserData.sub,
      email: googleUserData.email,
      name: googleUserData.name,
      avatar: googleUserData.picture
    })

    Logger.log(`[AuthController] User found or created: `, collabFlowUser)

    req.session.regenerate(regenerateErr => {
      if (regenerateErr) {
        return next(regenerateErr)
      }

      populateSession(req, collabFlowUser, googleTokenData)

      Logger.log(`[AuthController] Session populated: `, req.session)

      req.session.save(saveErr => {
        if (saveErr) {
          return next(saveErr)
        }
        setNewCsrfCookie(res)
        Logger.log(`[AuthController] Token exchange successful, session and new CSRF token saved.`)
        return res.status(200).json({ success: true })
      })
      return undefined
    })
  } catch (error) {
    Logger.error(`[AuthController] Token exchange failed:`, error)
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
    // The session cookie is cleared by express-session's destroy method.
    // We can also explicitly clear it for defense-in-depth and to remove the CSRF cookie.
    res.clearCookie(SESSION_COOKIE_NAME)
    res.clearCookie(CSRF_COOKIE_NAME)
    res.status(204).send()
    return undefined
  })
}

export const handleGetInternalToken = (req: Request, res: Response): void => {
  // Note: requireSession middleware should have already run and ensured session exists
  Logger.log(`[AuthController] handleGetInternalToken called for user ${req.session.userId}`)

  const token = generateInternalToken({
    id: req.session.userId!,
    email: req.session.email!,
    name: req.session.name!
  })

  res.json({ token })
}
