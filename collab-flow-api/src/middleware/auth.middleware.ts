import { type Request, type Response, type NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { UnauthorizedError } from '../utils/errors'
import config from '../config'
import Logger from '../utils/logger'

interface AuthenticatedRequest extends Request {
  user?: string | jwt.JwtPayload;
}

/**
 * Middleware to validate internal JWTs issued by the API Gateway.
 * It extracts the token from the Authorization header, verifies it,
 * and attaches the decoded payload to `req.user`.
 */
export const authGatewayMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith(`Bearer `)) {
      Logger.warn(`[AuthGateway] Missing or malformed Authorization header.`)
      next(new UnauthorizedError(`Missing or malformed Authorization header.`))
      return
    }

    const token = authHeader.split(` `)[1]

    if (!token) {
      Logger.warn(`[AuthGateway] Token missing after Bearer.`)
      next(new UnauthorizedError(`Token missing after Bearer.`))
      return
    }

    // Verify the token using the secret from config
    const decoded = jwt.verify(token, config.jwt.secret as string)

    // Attach the decoded payload to the request
    req.user = decoded
    Logger.log(`[AuthGateway] Token validated for user: ${typeof decoded === `object` ? JSON.stringify(decoded) : decoded}`)
    next()
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      Logger.warn(`[AuthGateway] JWT validation failed: ${error.message}`)
      next(new UnauthorizedError(`Invalid token: ${error.message}`))
    } else if (error instanceof UnauthorizedError) {
      Logger.warn(`[AuthGateway] Authentication failed: ${error.message}`)
      next(error)
    } else {
      Logger.error(`[AuthGateway] Unexpected error during token validation:`, error)
      next(new UnauthorizedError(`Authentication failed.`))
    }
  }
}
