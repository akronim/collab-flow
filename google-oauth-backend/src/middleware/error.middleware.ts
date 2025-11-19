import { type Request, type Response, type NextFunction } from 'express'
import { AppError } from '../utils/errors'
import { ErrorMessages } from '../constants'

interface ErrorResponse {
  status?: number;
  data?: {
    error?: string;
    message?: string;
  };
}

interface ErrorWithResponse extends Error {
  response?: ErrorResponse;
}

export const errorMiddleware = (
  error: ErrorWithResponse,
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

  const status = error.response?.status ?? 500
  const details = error.response?.data ?? { message: error.message }

  const errorMap: Record<string, string> = {
    invalid_grant_401: ErrorMessages.TOKEN_EXCHANGE_FAILED,
    invalid_grant_400: ErrorMessages.REFRESH_FAILED,
    invalid_token_401: ErrorMessages.TOKEN_VALIDATION_FAILED,
    400: ErrorMessages.BAD_REQUEST,
    401: ErrorMessages.UNAUTHORIZED
  }

  let errorMessage = ErrorMessages.UNEXPECTED_ERROR
  const specificErrorKey = `${details.error ?? ``}_${status}`
  const generalStatusKey = status.toString()

  if (specificErrorKey in errorMap) {
    errorMessage = errorMap[specificErrorKey]
  } else if (generalStatusKey in errorMap) {
    errorMessage = errorMap[generalStatusKey]
  }

  res.status(status).json({
    error: errorMessage,
    details: details
  })
}
