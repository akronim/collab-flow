import type { Request, Response, NextFunction } from 'express'
import { AppError } from '../utils/errors'
import { ErrorMessages } from '../constants'
import Logger from '../utils/logger'

export const requireSession = (req: Request, _res: Response, next: NextFunction): void => {
  Logger.log(`[requireSession] Validating session presence.`)
  if (!req.session?.userId) {
    Logger.warn(`[requireSession] Session validation failed: No session or user ID present.`)
    return next(new AppError(ErrorMessages.UNAUTHORIZED, 401))
  }
  next()
  return undefined
}
