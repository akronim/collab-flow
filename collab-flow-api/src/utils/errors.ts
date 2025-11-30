export class AppError extends Error {
  public status: number
  public isOperational: boolean
  public details?: Record<string, unknown>

  constructor(message: string, status: number, details?: Record<string, unknown>) {
    super(message)
    this.status = status
    this.isOperational = true // Indicates that this is a known, handled error
    this.details = details

    // Capture the stack trace, excluding the constructor call from the stack
    Error.captureStackTrace(this, this.constructor)
  }
}

// Extend this for specific error types if needed
export class UnauthorizedError extends AppError {
  constructor(message = `Unauthorized`, details?: Record<string, unknown>) {
    super(message, 401, details)
  }
}

export class BadRequestError extends AppError {
  constructor(message = `Bad Request`, details?: Record<string, unknown>) {
    super(message, 400, details)
  }
}

export class NotFoundError extends AppError {
  constructor(message = `Not Found`, details?: Record<string, unknown>) {
    super(message, 404, details)
  }
}
