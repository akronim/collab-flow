import { type Request, type Response, type NextFunction } from 'express'
import { AppError } from '../utils/errors'
import Logger from '../utils/logger'

export const errorMiddleware = (
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (error instanceof AppError) {
    res.status(error.status).json({
      error: error.message,
      details: error.details
    })
    return
  }

  // Handle errors that are not AppError instances (e.g., from external libraries, unexpected runtime errors)
  Logger.error(`Unhandled error: ${error.message}`, error.stack)

  res.status(500).json({
    error: `Internal Server Error`,
    details: error.message // Provide generic message for client, log actual message internally
  })
}
