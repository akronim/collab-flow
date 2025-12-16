import type { Request, Response, NextFunction } from 'express'
import config from '../config'
import { AppError } from '../utils/errors'
import { generateCsrfToken } from '../utils/csrfToken'
import Logger from '../utils/logger'
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from '../constants'

export const csrfMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  Logger.log(`[CSRF Middleware] Received request: ${req.method} ${req.originalUrl}`)

  // Generate CSRF token if not present
  if (!req.cookies?.[CSRF_COOKIE_NAME]) {
    Logger.log(`[CSRF Middleware] Generating CSRF token`)

    const token = generateCsrfToken()

    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: false,
      secure: config.nodeEnv === `production`,
      sameSite: `lax`
    })
  }

  // Skip validation for safe methods
  if ([`GET`, `HEAD`, `OPTIONS`].includes(req.method)) {
    Logger.log(`[CSRF Middleware] Safe method: ${req.method}`)
    return next()
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME]
  const headerToken = req.headers[CSRF_HEADER_NAME]

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    Logger.error(`[CSRF Middleware] Invalid CSRF token.`)
    return next(new AppError(`Invalid CSRF token`, 403))
  }

  next()
  return undefined
}
