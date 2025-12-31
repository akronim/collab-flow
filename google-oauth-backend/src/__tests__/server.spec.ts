// google-oauth-backend/src/__tests__/server.spec.ts

import { describe, it, expect, vi, beforeEach, type Mocked, type Mock } from 'vitest'
import request from 'supertest' // <-- ADDED SuperAgentTest import
import app from '../server'
import { googleApi } from '../utils/axios'
import { findOrCreateUser } from '../services/user.service'
import { apiEndpoints, ErrorMessages } from '../constants'
import type TestAgent from 'supertest/lib/agent'
import type { CollabFlowUser } from '../types'

vi.mock(`../config`, () => ({
  default: {
    nodeEnv: `test`,
    port: `3001`,
    collabFlowApiUrl: `http://localhost:3002`,
    db: {
      url: `postgres://test:test@localhost:5432/test`
    },
    google: {
      clientId: `test_client_id`,
      clientSecret: `test_client_secret`,
      redirectUri: `http://localhost:5173/auth/callback`
    },
    session: {
      secret: `test-session-secret`,
      maxAge: `7d`
    },
    internalJwt: {
      secret: `test-internal-jwt-secret`,
      expiresIn: `5m`
    },
    encryption: {
      key: `f1d2d2f924e986ac86fdf7b36c94bcdfadd2de1c89559c48c809e21824425429`
    },
    cors: {
      origin: `http://localhost:5173`
    }
  }
}))

// Mock the database module to avoid real connections in tests
vi.mock(`../db`, () => {
  const mockSessions = new Map<string, { data: string; expires_at: string; user_id: string | null }>()

  const mockSql = async (strings: TemplateStringsArray, ...values: unknown[]): Promise<unknown[]> => {
    const query = strings.join(`?`)

    // Handle SELECT for session get
    if (query.includes(`SELECT`)) {
      const sid = values[0] as string
      const session = mockSessions.get(sid)
      return session ? [session] : []
    }

    // Handle INSERT/UPDATE (UPSERT) for session set
    if (query.includes(`INSERT`)) {
      const [sid, data, expiresAt, userId] = values as [string, string, Date | string, string | null]
      mockSessions.set(sid, {
        data,
        expires_at: expiresAt instanceof Date ? expiresAt.toISOString() : String(expiresAt),
        user_id: userId
      })
      return []
    }

    // Handle DELETE for session destroy
    if (query.includes(`DELETE`)) {
      const idOrUserId = values[0] as string
      // Check if deleting by sid or user_id
      if (query.includes(`user_id`)) {
        for (const [sid, session] of mockSessions.entries()) {
          if (session.user_id === idOrUserId) {
            mockSessions.delete(sid)
          }
        }
      } else {
        mockSessions.delete(idOrUserId)
      }
      return []
    }

    // Handle UPDATE for session touch
    if (query.includes(`UPDATE`)) {
      const [expiresAt, sid] = values as [Date | string, string]
      const session = mockSessions.get(sid)
      if (session) {
        session.expires_at = expiresAt instanceof Date ? expiresAt.toISOString() : String(expiresAt)
      }
      return []
    }

    return []
  }

  return {
    createDb: vi.fn(() => ({ sql: mockSql, end: vi.fn() })),
    getDefaultDb: vi.fn(() => ({ sql: mockSql, end: vi.fn() })),
    closeDefaultConnection: vi.fn()
  }
})

vi.mock(`../utils/axios`, () => ({
  googleApi: {
    post: vi.fn(),
    get: vi.fn()
  }
}))

vi.mock(`../services/tokenStore.service`, () => ({
  default: {
    generateAndStore: vi.fn(val => `new-internal-from-${val}`),
    getGoogleRefreshToken: vi.fn(),
    deleteToken: vi.fn()
  }
}))

vi.mock(`../services/user.service`, () => ({
  findOrCreateUser: vi.fn()
}))

const mockedGoogleApi = googleApi as Mocked<typeof googleApi>
const mockedFindOrCreateUser = findOrCreateUser as Mock

describe(`Backend API Tests`, () => {
  const API_BASE_PATH = `/api`
  let agent: InstanceType<typeof TestAgent> 
  let csrfToken: string

  beforeEach(async () => {
    vi.clearAllMocks()
    agent = request.agent(app) 
    const res = await agent.get(`/health`)
    const csrfCookieHeader = res.headers[`set-cookie`]
    if (csrfCookieHeader && Array.isArray(csrfCookieHeader)) {
      const csrfCookie = (csrfCookieHeader as string[]).find(c => c.startsWith(`collabflow.csrf=`))
      if (csrfCookie) {
        csrfToken = csrfCookie.split(`;`)[0].split(`=`)[1]
        return
      }
    }
    throw new Error(`CSRF cookie not found in response`)
  })

  describe(`GET /`, () => {
    it(`responds with a success message`, async () => {
      const response = await agent.get(`/`)
      expect(response.status).toBe(200)
      expect(response.body).toEqual({ status: `OK`, message: `OAuth Backend Running` })
    })
  })

  describe(`GET /health`, () => {
    it(`responds with status OK and service details`, async () => {
      const response = await agent.get(`/health`)
      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        status: `OK`,
        service: `oauth-gateway`,
        downstream: `http://localhost:3002`
      })
    })
  })

  describe(`POST ${API_BASE_PATH}${apiEndpoints.TOKEN}`, () => {
    it(`should return 400 if code or codeVerifier is missing`, async () => {
      const response1 = await agent
        .post(`${API_BASE_PATH}${apiEndpoints.TOKEN}`)
        .set(`x-csrf-token`, csrfToken)
        .send({ code: `some_code` })
      expect(response1.status).toBe(400)
      expect(response1.body.error).toBe(ErrorMessages.MISSING_CODE_OR_VERIFIER)

      const response2 = await agent
        .post(`${API_BASE_PATH}${apiEndpoints.TOKEN}`)
        .set(`x-csrf-token`, csrfToken)
        .send({ codeVerifier: `some_verifier` })
      expect(response2.status).toBe(400)
      expect(response2.body.error).toBe(ErrorMessages.MISSING_CODE_OR_VERIFIER)
    })

    it(`should create a session and set a cookie on successful code exchange`, async () => {
      mockedGoogleApi.post.mockResolvedValueOnce({
        data: {
          access_token: `mock_access_token`,
          refresh_token: `mock_refresh_token`
        }
      })
      mockedGoogleApi.get.mockResolvedValueOnce({
        data: {
          sub: `google_id_123`,
          email: `test@example.com`,
          name: `Test User`,
          picture: `https://example.com/avatar.jpg`
        }
      })
      const mockUser: CollabFlowUser = {
        id: `internal-uuid-456`,
        googleUserId: `google_id_123`,
        email: `test@example.com`,
        name: `Test User`,
        avatar: `https://example.com/avatar.jpg`,
        role: `member`,
        status: `active`,
        createdAt: `2024-01-01T00:00:00.000Z`,
        updatedAt: `2024-01-01T00:00:00.000Z`
      }
      mockedFindOrCreateUser.mockResolvedValueOnce(mockUser)

      const response = await agent
        .post(`${API_BASE_PATH}${apiEndpoints.TOKEN}`)
        .set(`x-csrf-token`, csrfToken)
        .send({ code: `auth_code`, codeVerifier: `code_verifier` })

      expect(response.status).toBe(200)
      expect(response.body).toEqual({ success: true })

      const setCookieHeader = response.headers[`set-cookie`]
      expect(Array.isArray(setCookieHeader)).toBe(true)
      if (Array.isArray(setCookieHeader)) {
        const sessionCookie = (setCookieHeader as string[]).find(c => c.startsWith(`collabflow.sid=`))
        expect(sessionCookie).toContain(`HttpOnly`)
        expect(sessionCookie).toContain(`Path=/`)
        expect(sessionCookie).toContain(`SameSite=Lax`)
      }
    })

    it(`should handle token exchange failure from Google`, async () => {
      mockedGoogleApi.post.mockRejectedValueOnce({
        response: {
          status: 401,
          data: { error: `invalid_grant`, error_description: `Bad code` }
        }
      })

      const response = await agent
        .post(`${API_BASE_PATH}${apiEndpoints.TOKEN}`)
        .set(`x-csrf-token`, csrfToken)
        .send({ code: `bad_code`, codeVerifier: `code_verifier` })

      expect(response.status).toBe(401)
      expect(response.body.error).toBe(ErrorMessages.TOKEN_EXCHANGE_FAILED)
      expect(response.body.details.error).toBe(`invalid_grant`)
    })
  })

  describe(`POST ${API_BASE_PATH}${apiEndpoints.LOGOUT}`, () => {
    it(`should return 204 for a session-less logout request`, async () => {
      const freshAgent = request.agent(app)
      const healthRes = await freshAgent.get(`/health`)
      
      let freshCsrfToken = ``
      const csrfCookieHeader = healthRes.headers[`set-cookie`]
      if (csrfCookieHeader && Array.isArray(csrfCookieHeader)) {
        const freshCsrfCookie = (csrfCookieHeader as string[]).find(c => c.startsWith(`collabflow.csrf=`))
        if (freshCsrfCookie) {
          freshCsrfToken = freshCsrfCookie.split(`;`)[0].split(`=`)[1]
        }
      }
      if (!freshCsrfToken) {
        throw new Error(`CSRF cookie not found in response for fresh agent`)
      }


      const response = await freshAgent
        .post(`${API_BASE_PATH}${apiEndpoints.LOGOUT}`)
        .set(`x-csrf-token`, freshCsrfToken)
        .send()

      expect(response.status).toBe(204)
      const setCookieHeader = response.headers[`set-cookie`]
      if (setCookieHeader && Array.isArray(setCookieHeader)) {
        const sessionCookie = (setCookieHeader as string[]).find(c => c.startsWith(`collabflow.sid=`))
        // we now expect a Set-Cookie header that expires the cookie.
        expect(sessionCookie).toBeDefined()
        expect(sessionCookie).toContain(`Expires=Thu, 01 Jan 1970`)
      }
    })
  })
})
