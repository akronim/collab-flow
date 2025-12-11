import type { Request, Response, NextFunction } from 'express'
import { AppError } from '../utils/errors'
import { ErrorMessages } from '../constants'

export const requireSession = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.session?.userId) {
    return next(new AppError(ErrorMessages.UNAUTHORIZED, 401))
  }
  return next()
}
