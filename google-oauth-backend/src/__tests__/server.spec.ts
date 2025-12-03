import { describe, it, expect, vi, beforeEach, type Mocked } from 'vitest'
import request from 'supertest'
import app from '../server'
import { googleApi } from '../utils/axios'
import { apiEndpoints, ErrorMessages, GoogleOAuthEndpoints } from '../constants'
import tokenStore from '../services/tokenStore.service'

vi.mock(`../config`, () => ({
  default: {
    port: `3001`,
    collabFlowApiUrl: `http://localhost:3002`, // Added for gateway tests
    google: {
      clientId: `test_client_id`,
      clientSecret: `test_client_secret`,
      redirectUri: `http://localhost:5173/auth/callback`
    },
    jwt: {
      secret: `test-jwt-secret`,
      expiresIn: `15m`
    },
    cors: {
      origin: `http://localhost:5173`
    }
  }
}))

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

const mockedGoogleApi = googleApi as Mocked<typeof googleApi>
const mockedTokenStore = tokenStore as Mocked<typeof tokenStore>

describe(`Backend API Tests`, () => {
  const API_BASE_PATH = `/api` 

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe(`GET /`, () => {
    it(`responds with a success message`, async () => {
      const response = await request(app).get(`/`)
      expect(response.status).toBe(200)
      expect(response.body).toEqual({ status: `OK`, message: `OAuth Backend Running` })
    })
  })

  describe(`GET /health`, () => {
    it(`responds with status OK and service details`, async () => {
      const response = await request(app).get(`/health`)
      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        status: `OK`,
        service: `oauth-gateway`,
        downstream: `http://localhost:3002` // From mocked config
      })
    })
  })

  describe(`POST ${API_BASE_PATH}${apiEndpoints.TOKEN}`, () => {
    it(`should return 400 if code or codeVerifier is missing`, async () => {
      const response1 = await request(app).post(`${API_BASE_PATH}${apiEndpoints.TOKEN}`).send({ code: `some_code` })
      expect(response1.status).toBe(400)
      expect(response1.body.error).toBe(ErrorMessages.MISSING_CODE_OR_VERIFIER)

      const response2 = await request(app).post(`${API_BASE_PATH}${apiEndpoints.TOKEN}`).send({ codeVerifier: `some_verifier` })
      expect(response2.status).toBe(400)
      expect(response2.body.error).toBe(ErrorMessages.MISSING_CODE_OR_VERIFIER)
    })

    it(`should exchange code for tokens and return an internal JWT`, async () => {
      mockedGoogleApi.post.mockResolvedValueOnce({
        data: {
          access_token: `mock_access_token`,
          refresh_token: `mock_refresh_token`,
          expires_in: 3600,
          id_token: `mock_id_token`
        }
      })

      // Mock the subsequent validation call
      mockedGoogleApi.get.mockResolvedValueOnce({
        data: {
          id: `google_id_123`,
          email: `test@example.com`,
          name: `Test User`
        }
      })

      const response = await request(app)
        .post(`${API_BASE_PATH}${apiEndpoints.TOKEN}`)
        .send({ code: `auth_code`, codeVerifier: `code_verifier` })

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty(`internal_access_token`)
      expect(response.body).toHaveProperty(`expires_in`, 900) // 15m from mocked config
      expect(response.body).toHaveProperty(`expires_at`)

      expect(response.body).not.toHaveProperty(`access_token`)
      expect(response.body).not.toHaveProperty(`refresh_token`)
      expect(response.body).not.toHaveProperty(`id_token`)

      // Verify both Google API calls were made
      expect(mockedGoogleApi.post).toHaveBeenCalledWith(
        GoogleOAuthEndpoints.TOKEN_EXCHANGE,
        expect.stringContaining(`client_id=test_client_id`)
      )
      expect(mockedGoogleApi.get).toHaveBeenCalledWith(
        GoogleOAuthEndpoints.USER_INFO,
        expect.objectContaining({
          headers: { Authorization: `Bearer mock_access_token` }
        })
      )
    })

    it(`should handle token exchange failure from Google`, async () => {
      mockedGoogleApi.post.mockRejectedValueOnce({
        response: {
          status: 401,
          data: { error: `invalid_grant`, error_description: `Bad code` }
        }
      })

      const response = await request(app)
        .post(`${API_BASE_PATH}${apiEndpoints.TOKEN}`)
        .send({ code: `bad_code`, codeVerifier: `code_verifier` })

      expect(response.status).toBe(401)
      expect(response.body.error).toBe(ErrorMessages.TOKEN_EXCHANGE_FAILED)
      expect(response.body.details.error).toBe(`invalid_grant`)
    })
  })

  describe(`POST ${API_BASE_PATH}${apiEndpoints.INTERNAL_REFRESH}`, () => {
    it(`should return 400 if internal_refresh_token cookie is missing`, async () => {
      const response = await request(app).post(`${API_BASE_PATH}${apiEndpoints.INTERNAL_REFRESH}`).send({})
      expect(response.status).toBe(400)
      expect(response.body.error).toBe(ErrorMessages.MISSING_REFRESH_TOKEN)
    })

    it(`should return 401 if token is not in store`, async () => {
      mockedTokenStore.getGoogleRefreshToken.mockReturnValueOnce(undefined)
      
      const response = await request(app)
        .post(`${API_BASE_PATH}${apiEndpoints.INTERNAL_REFRESH}`)
        .set(`Cookie`, `internal_refresh_token=not-in-store`)

      expect(response.status).toBe(401)
      expect(response.body.error).toBe(ErrorMessages.INVALID_REFRESH_TOKEN)
    })

    it(`should refresh internal token successfully`, async () => {
      mockedTokenStore.getGoogleRefreshToken.mockReturnValueOnce(`valid-google-refresh-token`)
      mockedGoogleApi.post.mockResolvedValueOnce({
        data: {
          access_token: `new_google_access_token`,
          expires_in: 3600
        }
      })
      mockedGoogleApi.get.mockResolvedValueOnce({
        data: {
          id: `google_id_123`,
          email: `test@example.com`,
          name: `Test User`
        }
      })

      const response = await request(app)
        .post(`${API_BASE_PATH}${apiEndpoints.INTERNAL_REFRESH}`)
        .set(`Cookie`, `internal_refresh_token=valid-internal-refresh`)

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty(`internal_access_token`)
      expect(response.body).not.toHaveProperty(`internal_refresh_token`)
      
      const cookie = response.headers[`set-cookie`][0]
      expect(cookie).toContain(`internal_refresh_token=new-internal-from-valid-google-refresh-token`)
      expect(cookie).toContain(`HttpOnly`)
      expect(cookie).toContain(`SameSite=Strict`)

      expect(mockedTokenStore.deleteToken).toHaveBeenCalledWith(`valid-internal-refresh`)
    })
  })

  describe(`POST ${API_BASE_PATH}${apiEndpoints.LOGOUT}`, () => {
    it(`should clear the refresh token cookie`, async () => {
      const response = await request(app)
        .post(`${API_BASE_PATH}${apiEndpoints.LOGOUT}`)
        .set(`Cookie`, `internal_refresh_token=some-token-to-clear`)

      expect(response.status).toBe(204)
      const cookie = response.headers[`set-cookie`][0]
      expect(cookie).toContain(`internal_refresh_token=;`)
      expect(cookie).toContain(`Max-Age=0`)
    })
  })
})
