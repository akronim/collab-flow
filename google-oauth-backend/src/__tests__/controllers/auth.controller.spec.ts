import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import { handleTokenRequest, handleGetCurrentUser, handleLogout } from '../../controllers/auth.controller'
import * as AuthService from '../../services/auth.service'
import { sessionStore } from '../../services/sessionStore.service'
import * as Encryption from '../../utils/encryption'
import { AppError } from '../../utils/errors'

// Mock services
vi.mock(`../../services/auth.service`)
vi.mock(`../../services/sessionStore.service`)
vi.mock(`../../utils/encryption`)

describe(`Auth Controller`, () => {
  let req: Partial<Request>
  let res: Partial<Response>
  let next: NextFunction

  beforeEach(() => {
    // Mock Express objects
    req = {
      body: {},
      session: {
        regenerate: vi.fn((cb: (err: Error | null) => void) => cb(null)),
        save: vi.fn((cb: (err: Error | null) => void) => cb(null)),
        destroy: vi.fn((cb: (err: Error | null) => void) => cb(null))
      } as unknown as Request[`session`]
    }
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      send: vi.fn()
    }
    next = vi.fn() as NextFunction
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // --- Tests for handleTokenRequest ---
  describe(`handleTokenRequest`, () => {
    it(`should create a session and return success on valid code`, async () => {
      const mockGoogleTokens = { access_token: `google_access`, refresh_token: `google_refresh` }
      const mockUserData = { id: `123`, email: `test@example.com`, name: `Test User` }
      const mockEncryptedToken = `encrypted_token`

      vi.spyOn(AuthService, `exchangeCodeForToken`).mockResolvedValue(mockGoogleTokens as any)
      vi.spyOn(AuthService, `validateAccessToken`).mockResolvedValue(mockUserData as any)
      vi.spyOn(Encryption, `encrypt`).mockReturnValue(mockEncryptedToken)

      req.body = { code: `valid_code`, codeVerifier: `valid_verifier` }

      await handleTokenRequest(req as Request<Record<string, never>, any, any>, res as Response, next)

      expect(req.session!.regenerate).toHaveBeenCalled()
      expect(req.session!.userId).toBe(mockUserData.id)
      expect(req.session!.email).toBe(mockUserData.email)
      expect(req.session!.name).toBe(mockUserData.name)
      expect(Encryption.encrypt).toHaveBeenCalledWith(mockGoogleTokens.refresh_token, expect.any(String))
      expect(req.session!.encryptedGoogleRefreshToken).toBe(mockEncryptedToken)
      expect(req.session!.save).toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({ success: true })
      expect(next).not.toHaveBeenCalled()
    })

    it(`should call next with an error if code is missing`, async () => {
      req.body = { codeVerifier: `verifier_only` }
      await handleTokenRequest(req as Request<Record<string, never>, any, any>, res as Response, next)
      expect(next).toHaveBeenCalledWith(expect.any(AppError))
      expect((next as Mock).mock.calls[0][0].status).toBe(400)
    })
  })

  // --- Tests for handleGetCurrentUser ---
  describe(`handleGetCurrentUser`, () => {
    it(`should return user data if a session exists`, () => {
      req.session!.userId = `123`
      req.session!.email = `test@example.com`
      req.session!.name = `Test User`

      handleGetCurrentUser(req as Request, res as Response, next)

      expect(res.json).toHaveBeenCalledWith({
        id: `123`,
        email: `test@example.com`,
        name: `Test User`
      })
      expect(next).not.toHaveBeenCalled()
    })

    it(`should call next with 401 error if no session exists`, () => {
      req.session!.userId = undefined

      handleGetCurrentUser(req as Request, res as Response, next)

      expect(next).toHaveBeenCalledWith(expect.any(AppError))
      expect((next as Mock).mock.calls[0][0].status).toBe(401)
    })
  })

  // --- Tests for handleLogout ---
  describe(`handleLogout`, () => {
    it(`should destroy all user sessions and the current session`, () => {
      req.session!.userId = `123`
      const destroyAllSpy = vi.spyOn(sessionStore, `destroyAllByUserId`)

      handleLogout(req as Request, res as Response, next)

      expect(destroyAllSpy).toHaveBeenCalledWith(`123`, expect.any(Function))
      expect(req.session!.destroy).toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(204)
      expect(res.send).toHaveBeenCalled()
      expect(next).not.toHaveBeenCalled()
    })

    it(`should still destroy current session even if destroyAllByUserId fails`, () => {
      req.session!.userId = `123`
      const destroyAllSpy = vi.spyOn(sessionStore, `destroyAllByUserId`).mockImplementation((_, cb) => {
        if (cb) {
          cb(new Error(`DB error`))
        }
      })
      
      handleLogout(req as Request, res as Response, next)

      expect(destroyAllSpy).toHaveBeenCalled()
      expect(req.session!.destroy).toHaveBeenCalled() // Crucially, this still gets called
      expect(next).not.toHaveBeenCalled() // The error is logged but not fatal to the logout itself
    })

    it(`should call next with an error if session destruction fails`, () => {
      req.session!.destroy = vi.fn((cb: (err: Error | null) => void) => cb(new Error(`Session destroy failed`))) as any

      handleLogout(req as Request, res as Response, next)

      expect(next).toHaveBeenCalledWith(expect.any(AppError))
      expect((next as Mock).mock.calls[0][0].status).toBe(500)
    })
  })
})
