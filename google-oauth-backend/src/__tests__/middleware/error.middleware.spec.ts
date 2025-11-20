import { describe, it, expect, vi, beforeEach } from 'vitest'

import { errorMiddleware } from '../../middleware/error.middleware'
import { AppError } from '../../utils/errors'
import { ErrorMessages } from '../../constants'

describe(`error.middleware`, () => {
  let res: any
  let req: any
  let next: any

  beforeEach(() => {
    req = {}
    res = {
      status: vi.fn(() => res),
      json: vi.fn()
    }
    next = vi.fn()
    vi.clearAllMocks()
  })

  it(`handles AppError and returns provided status, message and details`, () => {
    const err = new AppError(`Custom error`, 418, { info: `detail` })

    errorMiddleware(err as any, req, res, next)

    expect(res.status).toHaveBeenCalledWith(418)
    expect(res.json).toHaveBeenCalledWith({ error: `Custom error`, details: { info: `detail` } })
  })

  it(`maps specific error response (invalid_grant_401) to TOKEN_EXCHANGE_FAILED`, () => {
    const err: any = new Error(`bad code`)
    err.response = {
      status: 401,
      data: { error: `invalid_grant`, error_description: `Bad code` }
    }

    errorMiddleware(err, req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({
      error: ErrorMessages.TOKEN_EXCHANGE_FAILED,
      details: { error: `invalid_grant`, error_description: `Bad code` }
    })
  })

  it(`maps general status 400 to BAD_REQUEST when no specific key matches`, () => {
    const err: any = new Error(`bad request`)
    err.response = {
      status: 400,
      data: { message: `some message` }
    }

    errorMiddleware(err, req, res, next)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      error: ErrorMessages.BAD_REQUEST,
      details: { message: `some message` }
    })
  })

  it(`returns unexpected error for generic errors without response`, () => {
    const err: any = new Error(`unknown`)

    errorMiddleware(err, req, res, next)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({
      error: ErrorMessages.UNEXPECTED_ERROR,
      details: { message: `unknown` }
    })
  })
})
