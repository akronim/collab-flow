import { describe, it, expect, vi, beforeEach, type Mocked, type Mock } from 'vitest'

vi.mock(`../../services/auth.service`, () => ({
  exchangeCodeForToken: vi.fn(),
  refreshAccessToken: vi.fn(),
  validateAccessToken: vi.fn()
}))

vi.mock(`../../services/jwt.service`, () => ({
  default: {
    sign: vi.fn(),
    verify: vi.fn()
  }
}))

vi.mock(`../../services/tokenStore.service`, () => ({
  default: {
    generateAndStore: vi.fn(),
    getGoogleRefreshToken: vi.fn(),
    deleteToken: vi.fn()
  }
}))

import * as authService from '../../services/auth.service'
import jwtService, { type JwtService } from '../../services/jwt.service'
import tokenStore from '../../services/tokenStore.service'
import { handleInternalTokenRefresh, handleLogout, handleTokenRefresh, handleTokenRequest, handleTokenValidation } from '../../controllers/auth.controller'
import { ErrorMessages } from '../../constants'
import { AppError } from '../../utils/errors'

const mockedAuthService = authService as Mocked<typeof authService>
const mockedJwtService = jwtService as Mocked<JwtService>
const mockedTokenStore = tokenStore as Mocked<typeof tokenStore>

const getMockReqRes = (): { req: any; res: any; next: any } => {
  const req: any = {
    body: {},
    headers: {},
    cookies: {}
  }
  const res: any = {
    json: vi.fn().mockReturnThis(),
    cookie: vi.fn().mockReturnThis(),
    status: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis()
  }
  const next = vi.fn()
  return { req, res, next }
}

describe(`auth.controller`, () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe(`handleTokenRequest`, () => {
    it(`calls next with AppError when code or codeVerifier missing`, async () => {
      const { req, res, next } = getMockReqRes()
      req.body = { code: `only_code` }

      await handleTokenRequest(req, res, next)

      expect(next).toHaveBeenCalled()
      const err = next.mock.calls[0][0]
      expect(err).toBeInstanceOf(AppError)
      expect(err.message).toBe(ErrorMessages.MISSING_CODE_OR_VERIFIER)
      expect(res.json).not.toHaveBeenCalled()
    })

    it(`returns token data on success`, async () => {
      const { req, res, next } = getMockReqRes()
      req.body = { code: `c`, codeVerifier: `v` }

      const googleTokenData = {
        access_token: `google_access_token`,
        refresh_token: `google_refresh_token`
      }
      const userData = {
        id: `user-123`,
        name: `Test User`,
        email: `test@example.com`
      }
      const internalToken = `internal.jwt.token`
      const internalRefreshToken = `internal.refresh.token`
      const expiresIn = 900 // 15 minutes in seconds

      mockedAuthService.exchangeCodeForToken.mockResolvedValueOnce(googleTokenData as any)
      mockedAuthService.validateAccessToken.mockResolvedValueOnce(userData as any)
      mockedJwtService.sign.mockReturnValueOnce(internalToken)
      mockedTokenStore.generateAndStore.mockReturnValueOnce(internalRefreshToken)
      
      await handleTokenRequest(req, res, next)

      expect(next).not.toHaveBeenCalled()
      expect(res.cookie).toHaveBeenCalledWith(`internal_refresh_token`, internalRefreshToken, expect.any(Object))
      expect(res.json).toHaveBeenCalled()
      const respArg = (res.json as Mock).mock.calls[0][0]

      expect(respArg).toHaveProperty(`internal_access_token`, internalToken)
      expect(respArg).not.toHaveProperty(`internal_refresh_token`)
      expect(respArg).toHaveProperty(`expires_in`, expiresIn)
    })

    it(`forwards service errors to next`, async () => {
      const { req, res, next } = getMockReqRes()
      req.body = { code: `c`, codeVerifier: `v` }
      const error = new Error(`boom`)
      mockedAuthService.exchangeCodeForToken.mockRejectedValueOnce(error)

      await handleTokenRequest(req, res, next)

      expect(next).toHaveBeenCalledWith(error)
    })
  })

  describe(`handleTokenRefresh`, () => {
    it(`calls next with AppError when refresh_token missing`, async () => {
      const { req, res, next } = getMockReqRes()
      
      await handleTokenRefresh(req, res, next)

      expect(next).toHaveBeenCalled()
      const err = next.mock.calls[0][0]
      expect(err).toBeInstanceOf(AppError)
      expect(err.message).toBe(ErrorMessages.MISSING_REFRESH_TOKEN)
      expect(res.json).not.toHaveBeenCalled()
    })

    it(`returns refreshed token on success`, async () => {
      const { req, res, next } = getMockReqRes()
      req.body = { refresh_token: `rt` }
      const tokenData = { access_token: `new`, expires_in: 3600 }
      mockedAuthService.refreshAccessToken.mockResolvedValueOnce(tokenData as any)

      await handleTokenRefresh(req, res, next)

      expect(next).not.toHaveBeenCalled()
      expect(res.json).toHaveBeenCalledWith(tokenData)
    })

    it(`forwards service errors to next`, async () => {
      const { req, res, next } = getMockReqRes()
      req.body = { refresh_token: `rt` }
      const error = new Error(`fail`)
      mockedAuthService.refreshAccessToken.mockRejectedValueOnce(error)

      await handleTokenRefresh(req, res, next)

      expect(next).toHaveBeenCalledWith(error)
    })
  })

  describe(`handleTokenValidation`, () => {
    it(`calls next with AppError when Authorization header missing or invalid`, async () => {
      const { req: req1, res: res1, next: next1 } = getMockReqRes()
      await handleTokenValidation(req1, res1, next1)
      expect(next1).toHaveBeenCalled()
      let err = next1.mock.calls[0][0]
      expect(err).toBeInstanceOf(AppError)
      expect(err.message).toBe(ErrorMessages.MISSING_AUTH_HEADER)

      const { req: req2, res: res2, next: next2 } = getMockReqRes()
      req2.headers = { authorization: `Invalid` }
      await handleTokenValidation(req2, res2, next2)
      expect(next2).toHaveBeenCalled()
      err = next2.mock.calls[0][0]
      expect(err).toBeInstanceOf(AppError)
      expect(err.message).toBe(ErrorMessages.MISSING_AUTH_HEADER)
    })

    it(`returns user data on success`, async () => {
      const { req, res, next } = getMockReqRes()
      req.headers = { authorization: `Bearer mytoken` }
      const user = { id: `u1`, email: `e@e.com`, name: `User` }
      mockedAuthService.validateAccessToken.mockResolvedValueOnce(user as any)

      await handleTokenValidation(req, res, next)

      expect(next).not.toHaveBeenCalled()
      expect(res.json).toHaveBeenCalledWith(user)
    })

    it(`forwards service errors to next`, async () => {
      const { req, res, next } = getMockReqRes()
      req.headers = { authorization: `Bearer mytoken` }
      const error = new Error(`bad token`)
      mockedAuthService.validateAccessToken.mockRejectedValueOnce(error)

      await handleTokenValidation(req, res, next)

      expect(next).toHaveBeenCalledWith(error)
    })
  })

  describe(`handleInternalTokenRefresh`, () => {
    it(`calls next with AppError when internal_refresh_token is missing`, async () => {
      const { req, res, next } = getMockReqRes()

      await handleInternalTokenRefresh(req, res, next)

      expect(next).toHaveBeenCalled()
      const err = next.mock.calls[0][0]
      expect(err).toBeInstanceOf(AppError)
      expect(err.message).toBe(ErrorMessages.MISSING_REFRESH_TOKEN)
    })

    it(`returns new tokens on successful refresh`, async () => {
      const { req, res, next } = getMockReqRes()
      const internalRefreshToken = `internal-refresh`
      req.cookies = { internal_refresh_token: internalRefreshToken }

      const googleRefreshToken = `google-refresh`
      const newGoogleAccessToken = `new-google-access`
      const newInternalAccessToken = `new-internal-access`
      const newInternalRefreshToken = `new-internal-refresh`
      const userData = { id: `123`, name: `Test User`, email: `test@example.com` }
      const expiresIn = 900 // 15 minutes in seconds

      mockedTokenStore.getGoogleRefreshToken.mockReturnValueOnce(googleRefreshToken)
      mockedAuthService.refreshAccessToken.mockResolvedValueOnce({ access_token: newGoogleAccessToken } as any)
      mockedAuthService.validateAccessToken.mockResolvedValueOnce(userData as any)
      mockedJwtService.sign.mockReturnValueOnce(newInternalAccessToken)
      mockedTokenStore.generateAndStore.mockReturnValueOnce(newInternalRefreshToken)

      await handleInternalTokenRefresh(req, res, next)

      expect(next).not.toHaveBeenCalled()
      expect(res.cookie).toHaveBeenCalledWith(`internal_refresh_token`, newInternalRefreshToken, expect.any(Object))
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        internal_access_token: newInternalAccessToken,
        expires_in: expiresIn
      }))
      expect((res.json as Mock).mock.calls[0][0]).not.toHaveProperty(`internal_refresh_token`)
      expect(mockedTokenStore.deleteToken).toHaveBeenCalledWith(internalRefreshToken)
    })
  })

  describe(`handleLogout`, () => {
    it(`clears cookie and deletes token when cookie is present`, async () => {
      const { req, res, next } = getMockReqRes()
      const refreshToken = `some-refresh-token`
      req.cookies = { internal_refresh_token: refreshToken }

      await handleLogout(req, res)

      expect(mockedTokenStore.deleteToken).toHaveBeenCalledWith(refreshToken)
      expect(res.cookie).toHaveBeenCalledWith(`internal_refresh_token`, ``, expect.objectContaining({ maxAge: 0 }))
      expect(res.status).toHaveBeenCalledWith(204)
      expect(res.send).toHaveBeenCalled()
      expect(next).not.toHaveBeenCalled()
    })

    it(`clears cookie even when no cookie is present`, async () => {
      const { req, res, next } = getMockReqRes()

      await handleLogout(req, res)

      expect(mockedTokenStore.deleteToken).not.toHaveBeenCalled()
      expect(res.cookie).toHaveBeenCalledWith(`internal_refresh_token`, ``, expect.objectContaining({ maxAge: 0 }))
      expect(res.status).toHaveBeenCalledWith(204)
      expect(res.send).toHaveBeenCalled()
      expect(next).not.toHaveBeenCalled()
    })
  })
})
