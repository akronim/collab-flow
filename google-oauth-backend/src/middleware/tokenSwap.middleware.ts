import type { Request, Response, NextFunction } from 'express'
import * as authService from '../services/auth.service'
import jwtService from '../services/jwt.service'
import { getErrorMessage } from '../utils/errorHandler'
import Logger from '../utils/logger'

/**
 * Extracts the token from the Authorization header.
 * @param authorizationHeader The Authorization header value.
 * @returns The token string or null if not found.
 */
const extractToken = (authorizationHeader?: string): string | null => {
  if (!authorizationHeader || !authorizationHeader.startsWith(`Bearer `)) {
    return null
  }
  return authorizationHeader.substring(7)
}

/**
 * An async middleware to handle token validation and swapping before proxying.
 */
export const tokenSwapMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const googleAccessToken = extractToken(req.headers.authorization)

    if (!googleAccessToken) {
      Logger.log(`[TokenSwap] Missing or malformed token`)
      res.status(401).json({ message: `Missing or malformed token` })
      return
    }

    // Validate the Google access token and get user profile
    const userProfile = await authService.validateAccessToken(googleAccessToken)

    // Generate an internal JWT
    const internalToken = jwtService.sign(userProfile)

    // Replace the original token with the new internal token
    req.headers.authorization = `Bearer ${internalToken}`

    Logger.log(`[TokenSwap] Swapped token for user: ${userProfile.email}`)
    next()
  } catch (error) {
    const message = getErrorMessage(error)
    Logger.error(`[TokenSwap] Error:`, message)
    if (!res.headersSent) {
      res.status(401).json({ message: `Unauthorized: ${message}` })
    }
  }
}
