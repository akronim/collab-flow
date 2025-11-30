import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { authGatewayMiddleware } from '../../middleware/auth.middleware'
import { UnauthorizedError } from '../../utils/errors'
import config from '../../config'
import Logger from '../../utils/logger'

vi.mock(`../../utils/logger`)
vi.mock(`../../config`, () => ({
  default: {
    jwt: {
      secret: `test-secret-key`,
      expiresIn: `15m`
    }
  }
}))

describe(`authGatewayMiddleware`, () => {
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>
  let mockNext: NextFunction

  beforeEach(() => {
    vi.clearAllMocks()
    mockRequest = { headers: {} }
    mockResponse = {}
    mockNext = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe(`successful authentication`, () => {
    it(`should validate a valid token and attach decoded payload to req.user`, () => {
      const payload = { userId: `123`, email: `test@example.com` }
      const token = jwt.sign(payload, config.jwt.secret as string)

      mockRequest.headers = {
        authorization: `Bearer ${token}`
      }

      authGatewayMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      )

      expect(mockNext).toHaveBeenCalledWith()
      expect(mockNext).toHaveBeenCalledTimes(1)
      expect((mockRequest as any).user).toBeDefined()
      expect((mockRequest as any).user).toMatchObject(payload)
      expect(Logger.log).toHaveBeenCalledWith(
        expect.stringContaining(`[AuthGateway] Token validated for user:`)
      )
    })

    it(`should handle token with string payload`, () => {
      const payload = `simple-user-id`
      const token = jwt.sign(payload, config.jwt.secret as string)

      mockRequest.headers = {
        authorization: `Bearer ${token}`
      }

      authGatewayMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      )

      expect(mockNext).toHaveBeenCalledWith()
      expect((mockRequest as any).user).toBeDefined()
    })
  })

  describe(`missing authorization header`, () => {
    it(`should return UnauthorizedError when Authorization header is missing`, () => {
      mockRequest.headers = {}

      authGatewayMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      )

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(UnauthorizedError)
      )
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: `Missing or malformed Authorization header.`,
          status: 401
        })
      )
      expect(Logger.warn).toHaveBeenCalledWith(
        `[AuthGateway] Missing or malformed Authorization header.`
      )
    })

    it(`should return UnauthorizedError when Authorization header is empty string`, () => {
      mockRequest.headers = {
        authorization: ``
      }

      authGatewayMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      )

      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError))
      expect(Logger.warn).toHaveBeenCalled()
    })
  })

  describe(`malformed authorization header`, () => {
    it(`should return UnauthorizedError when Authorization header does not start with "Bearer "`, () => {
      mockRequest.headers = {
        authorization: `Basic some-token`
      }

      authGatewayMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      )

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: `Missing or malformed Authorization header.`,
          status: 401
        })
      )
      expect(Logger.warn).toHaveBeenCalledWith(
        `[AuthGateway] Missing or malformed Authorization header.`
      )
    })

    it(`should return UnauthorizedError when Bearer token is missing`, () => {
      mockRequest.headers = {
        authorization: `Bearer `
      }

      authGatewayMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      )

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: `Token missing after Bearer.`,
          status: 401
        })
      )
      expect(Logger.warn).toHaveBeenCalledWith(
        `[AuthGateway] Token missing after Bearer.`
      )
    })

    it(`should return UnauthorizedError when only "Bearer" is provided without space`, () => {
      mockRequest.headers = {
        authorization: `Bearer`
      }

      authGatewayMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      )

      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError))
    })
  })

  describe(`invalid token`, () => {
    it(`should return UnauthorizedError for invalid token signature`, () => {
      const token = jwt.sign({ userId: `123` }, `wrong-secret`)

      mockRequest.headers = {
        authorization: `Bearer ${token}`
      }

      authGatewayMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      )

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining(`Invalid token:`),
          status: 401
        })
      )
      expect(Logger.warn).toHaveBeenCalledWith(
        expect.stringContaining(`[AuthGateway] JWT validation failed:`)
      )
    })

    it(`should return UnauthorizedError for malformed token`, () => {
      mockRequest.headers = {
        authorization: `Bearer invalid.token.format`
      }

      authGatewayMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      )

      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError))
      expect(Logger.warn).toHaveBeenCalled()
    })

    it(`should return UnauthorizedError for expired token`, () => {
      const token = jwt.sign(
        { userId: `123` },
        config.jwt.secret as string,
        { expiresIn: `-1s` } // Already expired
      )

      mockRequest.headers = {
        authorization: `Bearer ${token}`
      }

      authGatewayMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      )

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining(`Invalid token:`),
          status: 401
        })
      )
    })

    it(`should return UnauthorizedError for token with invalid format`, () => {
      mockRequest.headers = {
        authorization: `Bearer not-a-jwt-token`
      }

      authGatewayMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      )

      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError))
    })
  })

  describe(`error handling`, () => {
    it(`should handle JsonWebTokenError and pass UnauthorizedError to next`, () => {
      const invalidToken = `invalid-token`
      mockRequest.headers = {
        authorization: `Bearer ${invalidToken}`
      }

      authGatewayMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      )

      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError))
      expect(Logger.warn).toHaveBeenCalledWith(
        expect.stringContaining(`[AuthGateway] JWT validation failed:`)
      )
    })

    it(`should propagate UnauthorizedError thrown during validation`, () => {
      // Mock jwt.verify to throw UnauthorizedError
      const error = new UnauthorizedError(`Custom unauthorized error`)
      vi.spyOn(jwt, `verify`).mockImplementation(() => {
        throw error
      })

      const token = `some-token`
      mockRequest.headers = {
        authorization: `Bearer ${token}`
      }

      authGatewayMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      )

      expect(mockNext).toHaveBeenCalledWith(error)
      expect(Logger.warn).toHaveBeenCalledWith(
        expect.stringContaining(`[AuthGateway] Authentication failed:`)
      )
    })

    it(`should handle unexpected errors and pass generic UnauthorizedError`, () => {
      // Mock jwt.verify to throw unexpected error
      vi.spyOn(jwt, `verify`).mockImplementation(() => {
        throw new Error(`Unexpected database error`)
      })

      const token = `some-token`
      mockRequest.headers = {
        authorization: `Bearer ${token}`
      }

      authGatewayMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      )

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: `Authentication failed.`,
          status: 401
        })
      )
      expect(Logger.error).toHaveBeenCalledWith(
        `[AuthGateway] Unexpected error during token validation:`,
        expect.any(Error)
      )
    })
  })

  describe(`edge cases`, () => {
    it(`should reject token when multiple spaces exist after 'Bearer'`, () => {
      const payload = { userId: `123` }
      const token = jwt.sign(payload, config.jwt.secret as string)

      mockRequest.headers = {
        authorization: `Bearer   ${token}` // ← 3 spaces → malformed
      }

      authGatewayMiddleware(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError))
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: `Token missing after Bearer.`
        })
      )
    })

    it(`should reject lowercase 'bearer' due to case-sensitive check`, () => {
      const payload = { userId: `123` }
      const token = jwt.sign(payload, config.jwt.secret as string)

      mockRequest.headers = {
        authorization: `bearer ${token}` // ← lowercase = invalid
      }

      authGatewayMiddleware(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError))
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: `Missing or malformed Authorization header.`
        })
      )
    })

    it(`should not attach user to request when authentication fails`, () => {
      mockRequest.headers = {
        authorization: `Bearer invalid-token-here`
      }

      authGatewayMiddleware(mockRequest as Request, mockResponse as Response, mockNext)

      expect(mockRequest.user).toBeUndefined()
      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError))
    })
  })

  // Clean working additions that won't cause TypeScript errors
  describe(`logging behavior`, () => {
    it(`should log exactly once for successful authentication`, () => {
      const payload = { userId: `123` }
      const token = jwt.sign(payload, config.jwt.secret as string)

      mockRequest.headers = {
        authorization: `Bearer ${token}`
      }

      authGatewayMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      )

      expect(Logger.log).toHaveBeenCalledTimes(1)
      expect(Logger.warn).not.toHaveBeenCalled()
      expect(Logger.error).not.toHaveBeenCalled()
    })

    it(`should log warning exactly once for malformed header`, () => {
      mockRequest.headers = {
        authorization: `InvalidFormat`
      }

      authGatewayMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      )

      expect(Logger.warn).toHaveBeenCalledTimes(1)
      expect(Logger.log).not.toHaveBeenCalled()
      expect(Logger.error).not.toHaveBeenCalled()
    })
  })

  describe(`token payload logging format`, () => {
    it(`should log object payload as JSON string`, () => {
      const payload = { userId: `123`, roles: [`admin`] }
      const token = jwt.sign(payload, config.jwt.secret as string)

      mockRequest.headers = {
        authorization: `Bearer ${token}`
      }

      authGatewayMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      )

      expect(Logger.log).toHaveBeenCalledWith(
        expect.stringContaining(`"userId":"123"`)
      )
      expect(Logger.log).toHaveBeenCalledWith(
        expect.stringContaining(`"roles":["admin"]`)
      )
      expect(Logger.log).toHaveBeenCalledWith(
        expect.stringContaining(`[AuthGateway] Token validated for user:`)
      )
    })

    it(`should log string payload directly`, () => {
      const payload = `user-123`
      const token = jwt.sign(payload, config.jwt.secret as string)

      mockRequest.headers = {
        authorization: `Bearer ${token}`
      }

      authGatewayMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      )

      expect(Logger.log).toHaveBeenCalledWith(
        expect.stringContaining(`user-123`)
      )
    })
  })

  describe(`security edge cases`, () => {
    it(`should handle very long tokens without crashing`, () => {
      const longToken = `a`.repeat(5000) // Long but reasonable length
      mockRequest.headers = {
        authorization: `Bearer ${longToken}`
      }

      authGatewayMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      )

      // Should handle gracefully without crashing
      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError))
    })

    it(`should handle tokens with special characters`, () => {
      const specialCharToken = `token.with.special.chars@123`
      mockRequest.headers = {
        authorization: `Bearer ${specialCharToken}`
      }

      authGatewayMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      )

      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError))
    })
  })
})
