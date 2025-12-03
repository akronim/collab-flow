import { describe, it, expect, vi, beforeEach, type Mocked } from 'vitest'

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
import { handleInternalTokenRefresh, handleTokenRefresh, handleTokenRequest, handleTokenValidation } from '../../controllers/auth.controller'
import { ErrorMessages } from '../../constants'
import { AppError } from '../../utils/errors'

const mockedAuthService = authService as Mocked<typeof authService>
const mockedJwtService = jwtService as Mocked<JwtService>
const mockedTokenStore = tokenStore as Mocked<typeof tokenStore>

describe(`auth.controller`, () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe(`handleTokenRequest`, () => {
    it(`calls next with AppError when code or codeVerifier missing`, async () => {
      const req: any = { body: { code: `only_code` } }
      const res: any = { json: vi.fn() }
      const next = vi.fn()

      await handleTokenRequest(req, res, next)

      expect(next).toHaveBeenCalled()
      const err = next.mock.calls[0][0]
      expect(err).toBeInstanceOf(AppError)
      expect(err.message).toBe(ErrorMessages.MISSING_CODE_OR_VERIFIER)
      expect(res.json).not.toHaveBeenCalled()
    })

    it(`returns token data on success`, async () => {
      const googleTokenData = {
        access_token: `google_access_token`,
        refresh_token: `google_refresh_token`,
        expires_in: 3600,
        id_token: `google_id_token`
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

      const req: any = { body: { code: `c`, codeVerifier: `v` } }
      const res: any = { json: vi.fn() }
      const next = vi.fn()

      const before = Date.now()
      await handleTokenRequest(req, res, next)
      const after = Date.now()

      expect(next).not.toHaveBeenCalled()
      expect(res.json).toHaveBeenCalled()
      const respArg = res.json.mock.calls[0][0]

      expect(respArg).toHaveProperty(`internal_access_token`, internalToken)
      expect(respArg).toHaveProperty(`internal_refresh_token`, internalRefreshToken)
      expect(respArg).toHaveProperty(`expires_in`, expiresIn)
      expect(respArg).toHaveProperty(`expires_at`)

      const expiresAt = respArg.expires_at
      expect(typeof expiresAt).toBe(`number`)
      expect(expiresAt).toBeGreaterThanOrEqual(before + expiresIn * 1000)
      expect(expiresAt).toBeLessThanOrEqual(after + expiresIn * 1000)

      expect(respArg).not.toHaveProperty(`access_token`)
      expect(respArg).not.toHaveProperty(`refresh_token`)
      expect(respArg).not.toHaveProperty(`id_token`)
    })

    it(`forwards service errors to next`, async () => {
      const error = new Error(`boom`)
      mockedAuthService.exchangeCodeForToken.mockRejectedValueOnce(error)

      const req: any = { body: { code: `c`, codeVerifier: `v` } }
      const res: any = { json: vi.fn() }
      const next = vi.fn()

      await handleTokenRequest(req, res, next)

      expect(next).toHaveBeenCalledWith(error)
    })
  })

  describe(`handleTokenRefresh`, () => {
    it(`calls next with AppError when refresh_token missing`, async () => {
      const req: any = { body: {} }
      const res: any = { json: vi.fn() }
      const next = vi.fn()

      await handleTokenRefresh(req, res, next)

      expect(next).toHaveBeenCalled()
      const err = next.mock.calls[0][0]
      expect(err).toBeInstanceOf(AppError)
      expect(err.message).toBe(ErrorMessages.MISSING_REFRESH_TOKEN)
      expect(res.json).not.toHaveBeenCalled()
    })

    it(`returns refreshed token on success`, async () => {
      const tokenData = { access_token: `new`, expires_in: 3600 }
      mockedAuthService.refreshAccessToken.mockResolvedValueOnce(tokenData as any)

      const req: any = { body: { refresh_token: `rt` } }
      const res: any = { json: vi.fn() }
      const next = vi.fn()

      await handleTokenRefresh(req, res, next)

      expect(next).not.toHaveBeenCalled()
      expect(res.json).toHaveBeenCalledWith(tokenData)
    })

    it(`forwards service errors to next`, async () => {
      const error = new Error(`fail`)
      mockedAuthService.refreshAccessToken.mockRejectedValueOnce(error)

      const req: any = { body: { refresh_token: `rt` } }
      const res: any = { json: vi.fn() }
      const next = vi.fn()

      await handleTokenRefresh(req, res, next)

      expect(next).toHaveBeenCalledWith(error)
    })
  })

  describe(`handleTokenValidation`, () => {
    it(`calls next with AppError when Authorization header missing or invalid`, async () => {
      const req1: any = { headers: {} }
      const req2: any = { headers: { authorization: `Invalid` } }
      const res: any = { json: vi.fn() }
      const next = vi.fn()

      await handleTokenValidation(req1, res, next)
      expect(next).toHaveBeenCalled()
      let err = next.mock.calls[0][0]
      expect(err).toBeInstanceOf(AppError)
      expect(err.message).toBe(ErrorMessages.MISSING_AUTH_HEADER)

      vi.clearAllMocks()

      await handleTokenValidation(req2, res, next)
      expect(next).toHaveBeenCalled()
      err = next.mock.calls[0][0]
      expect(err).toBeInstanceOf(AppError)
      expect(err.message).toBe(ErrorMessages.MISSING_AUTH_HEADER)
    })

    it(`returns user data on success`, async () => {
      const user = { id: `u1`, email: `e@e.com`, name: `User` }
      mockedAuthService.validateAccessToken.mockResolvedValueOnce(user as any)

      const req: any = { headers: { authorization: `Bearer mytoken` } }
      const res: any = { json: vi.fn() }
      const next = vi.fn()

      await handleTokenValidation(req, res, next)

      expect(next).not.toHaveBeenCalled()
      expect(res.json).toHaveBeenCalledWith(user)
    })

    it(`forwards service errors to next`, async () => {
      const error = new Error(`bad token`)
      mockedAuthService.validateAccessToken.mockRejectedValueOnce(error)

      const req: any = { headers: { authorization: `Bearer mytoken` } }
      const res: any = { json: vi.fn() }
      const next = vi.fn()

      await handleTokenValidation(req, res, next)

      expect(next).toHaveBeenCalledWith(error)
    })
  })

  describe(`handleInternalTokenRefresh`, () => {
    it(`calls next with AppError when internal_refresh_token is missing`, async () => {
      const req: any = { body: {} }
      const res: any = { json: vi.fn() }
      const next = vi.fn()

      await handleInternalTokenRefresh(req, res, next)

      expect(next).toHaveBeenCalled()
      const err = next.mock.calls[0][0]
      expect(err).toBeInstanceOf(AppError)
      expect(err.message).toBe(ErrorMessages.MISSING_REFRESH_TOKEN)
    })

    it(`returns new tokens on successful refresh`, async () => {
      const internalRefreshToken = `internal-refresh`
      const googleRefreshToken = `google-refresh`
      const newGoogleAccessToken = `new-google-access`
      const newInternalAccessToken = `new-internal-access`
      const newInternalRefreshToken = `new-internal-refresh`
      const userData = { id: `123`, name: `Test User`, email: `test@example.com`, verified_email: true, given_name: `Test`, family_name: `User`, picture: ``, locale: `en` }
      const expiresIn = 900 // 15 minutes in seconds

      mockedTokenStore.getGoogleRefreshToken.mockReturnValueOnce(googleRefreshToken)
      mockedAuthService.refreshAccessToken.mockResolvedValueOnce({ access_token: newGoogleAccessToken, expires_in: 3600, token_type: `Bearer`, scope: `any` })
      mockedAuthService.validateAccessToken.mockResolvedValueOnce(userData)
      mockedJwtService.sign.mockReturnValueOnce(newInternalAccessToken)
      mockedTokenStore.generateAndStore.mockReturnValueOnce(newInternalRefreshToken)

      const req: any = { body: { internal_refresh_token: internalRefreshToken } }
      const res: any = { json: vi.fn() }
      const next = vi.fn()

      await handleInternalTokenRefresh(req, res, next)

      expect(next).not.toHaveBeenCalled()
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        internal_access_token: newInternalAccessToken,
        internal_refresh_token: newInternalRefreshToken,
        expires_in: expiresIn
      }))
      expect(mockedTokenStore.deleteToken).toHaveBeenCalledWith(internalRefreshToken)
    })
  })
})
