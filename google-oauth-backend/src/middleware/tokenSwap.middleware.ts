import type { Request, Response, NextFunction } from 'express'
import jwtService from '../services/jwt.service'
import { getErrorMessage } from '../utils/errorHandler'
import Logger from '../utils/logger'
import type { UserInfo } from '../types'

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
    const internalToken = extractToken(req.headers.authorization)

    if (!internalToken) {
      Logger.log(`[TokenSwap] Missing or malformed token`)
      res.status(401).json({ message: `Missing or malformed token` })
      return
    }

    // Validate the internal JWT
    const decoded = jwtService.verify<UserInfo>(internalToken)
    
    // Optional: Attach user info to request for downstream use
    // @ts-expect-error: Attaching custom property to request
    req.user = decoded

    Logger.log(`[TokenSwap] Internal token verified for user: ${decoded.email}`)
    next()
  } catch (error) {
    const message = getErrorMessage(error)
    Logger.error(`[TokenSwap] Error:`, message)
    if (!res.headersSent) {
      res.status(401).json({ message: `Unauthorized: ${message}` })
    }
  }
}
