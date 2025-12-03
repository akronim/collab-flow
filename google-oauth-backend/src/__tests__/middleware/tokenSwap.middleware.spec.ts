import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import { tokenSwapMiddleware } from '../../middleware/tokenSwap.middleware'
import * as authService from '../../services/auth.service'
import jwtService from '../../services/jwt.service'
import type { UserInfo } from '../../types'

vi.mock(`../../services/auth.service`)
vi.mock(`../../services/jwt.service`)

describe(`Token Swap Middleware`, () => {
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>
  let nextFunction: NextFunction = vi.fn()

  beforeEach(() => {
    mockRequest = {
      headers: {}
    }
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    }
    nextFunction = vi.fn()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it(`should return 401 if no authorization header is provided`, async () => {
    await tokenSwapMiddleware(mockRequest as Request, mockResponse as Response, nextFunction)

    expect(mockResponse.status).toHaveBeenCalledWith(401)
    expect(mockResponse.json).toHaveBeenCalledWith({ message: `Missing or malformed token` })
    expect(nextFunction).not.toHaveBeenCalled()
  })

  it(`should return 401 if token is invalid`, async () => {
    mockRequest.headers = { authorization: `Bearer invalid-token` }
    vi.spyOn(jwtService, `verify`).mockImplementation(() => {
      throw new Error(`Invalid token`)
    })

    await tokenSwapMiddleware(mockRequest as Request, mockResponse as Response, nextFunction)

    expect(mockResponse.status).toHaveBeenCalledWith(401)
    expect(mockResponse.json).toHaveBeenCalledWith({ message: `Unauthorized: Invalid token` })
    expect(nextFunction).not.toHaveBeenCalled()
  })

  it(`should call next() if internal JWT is valid`, async () => {
    const fakeUser: UserInfo = {
      id: `123`,
      email: `test@example.com`,
      verified_email: true,
      name: `Test User`,
      given_name: `Test`,
      family_name: `User`,
      picture: `pic.jpg`,
      locale: `en`
    }
    const internalToken = `internal-jwt-token`
    mockRequest.headers = { authorization: `Bearer ${internalToken}` }

    const validateSpy = vi.spyOn(authService, `validateAccessToken`)
    const verifySpy = vi.spyOn(jwtService, `verify`).mockReturnValue(fakeUser)

    await tokenSwapMiddleware(mockRequest as Request, mockResponse as Response, nextFunction)

    expect(nextFunction).toHaveBeenCalled()
    expect(mockResponse.status).not.toHaveBeenCalled()
    
    // The middleware should only verify, not swap the token
    expect(mockRequest.headers.authorization).toBe(`Bearer ${internalToken}`)

    expect(verifySpy).toHaveBeenCalledWith(internalToken)
    expect(validateSpy).not.toHaveBeenCalled()
  })
})
