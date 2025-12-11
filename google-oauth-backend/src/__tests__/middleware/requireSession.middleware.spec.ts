import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import { requireSession } from '../../middleware/requireSession.middleware'
import { AppError } from '../../utils/errors'
import { ErrorMessages } from '../../constants'

describe(`requireSession Middleware`, () => {
  let req: Partial<Request>
  let res: Partial<Response>
  let next: NextFunction

  beforeEach(() => {
    req = {
      session: {} as any
    }
    res = {}
    next = vi.fn()
  })

  it(`should call next() with no arguments if session contains a userId`, () => {
    req.session!.userId = `user-123`

    requireSession(req as Request, res as Response, next)

    expect(next).toHaveBeenCalledExactlyOnceWith()
  })

  it(`should call next() with an AppError if session is missing`, () => {
    req.session = undefined

    requireSession(req as Request, res as Response, next)

    expect(next).toHaveBeenCalledExactlyOnceWith(expect.any(AppError))
    
    const error = (next as Mock).mock.calls[0][0]
    expect(error.status).toBe(401)
    expect(error.message).toBe(ErrorMessages.UNAUTHORIZED)
  })

  it(`should call next() with an AppError if userId is missing from session`, () => {
    req.session!.userId = undefined

    requireSession(req as Request, res as Response, next)

    expect(next).toHaveBeenCalledExactlyOnceWith(expect.any(AppError))
    
    const error = (next as Mock).mock.calls[0][0]
    expect(error.status).toBe(401)
    expect(error.message).toBe(ErrorMessages.UNAUTHORIZED)
  })
})
