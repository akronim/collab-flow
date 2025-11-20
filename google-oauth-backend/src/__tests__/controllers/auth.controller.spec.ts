import { describe, it, expect, vi, beforeEach, type Mocked } from 'vitest'

vi.mock(`../../services/auth.service`, () => ({
  exchangeCodeForToken: vi.fn(),
  refreshAccessToken: vi.fn(),
  validateAccessToken: vi.fn()
}))

import * as authService from '../../services/auth.service'
import { handleTokenRefresh, handleTokenRequest, handleTokenValidation } from '../../controllers/auth.controller'
import { ErrorMessages } from '../../constants'
import { AppError } from '../../utils/errors'

const mockedAuthService = authService as Mocked<typeof authService>

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
      const tokenData = {
        access_token: `a`,
        refresh_token: `r`,
        expires_in: 3600,
        id_token: `id`
      }

      mockedAuthService.exchangeCodeForToken.mockResolvedValueOnce(tokenData as any)

      const req: any = { body: { code: `c`, codeVerifier: `v` } }
      const res: any = { json: vi.fn() }
      const next = vi.fn()

      const before = Date.now()
      await handleTokenRequest(req, res, next)
      const after = Date.now()

      expect(next).not.toHaveBeenCalled()
      expect(res.json).toHaveBeenCalled()
      const respArg = res.json.mock.calls[0][0]
      expect(respArg).toEqual(expect.objectContaining({
        access_token: `a`,
        refresh_token: `r`,
        expires_in: 3600,
        id_token: `id`
      }))
      expect(typeof respArg.expires_at).toBe(`number`)
      expect(respArg.expires_at).toBeGreaterThanOrEqual(before + 3600 * 1000)
      expect(respArg.expires_at).toBeLessThanOrEqual(after + 3600 * 1000)
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
})
