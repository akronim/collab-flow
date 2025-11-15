import { describe, it, expect, vi, beforeEach, Mocked } from 'vitest'
import request from 'supertest'
import app from '../server'
import { googleApi } from '../utils/axios'
import { apiEndpoints, ErrorMessages, GoogleOAuthEndpoints } from '../constants'

vi.mock('../config', () => ({
  default: {
    port: '3001',
    google: {
      clientId: 'test_client_id',
      clientSecret: 'test_client_secret',
      redirectUri: 'http://localhost:5173/auth/callback',
    },
    cors: {
      origin: 'http://localhost:5173',
    }
  }
}));

vi.mock('../utils/axios', () => ({
  googleApi: {
    post: vi.fn(),
    get: vi.fn(),
  },
}))

const mockedGoogleApi = googleApi as Mocked<typeof googleApi>

describe('Backend API Tests', () => {
  const API_BASE_PATH = '/api'; 

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /', () => {
    it('responds with a success message', async () => {
      const response = await request(app).get('/')
      expect(response.status).toBe(200)
      expect(response.body).toEqual({ status: 'OK', message: 'OAuth Backend Running' })
    })
  })

  describe(`POST ${API_BASE_PATH}${apiEndpoints.TOKEN}`, () => {
    it('should return 400 if code or codeVerifier is missing', async () => {
      const response1 = await request(app).post(`${API_BASE_PATH}${apiEndpoints.TOKEN}`).send({ code: 'some_code' })
      expect(response1.status).toBe(400)
      expect(response1.body.error).toBe(ErrorMessages.MISSING_CODE_OR_VERIFIER)

      const response2 = await request(app).post(`${API_BASE_PATH}${apiEndpoints.TOKEN}`).send({ codeVerifier: 'some_verifier' })
      expect(response2.status).toBe(400)
      expect(response2.body.error).toBe(ErrorMessages.MISSING_CODE_OR_VERIFIER)
    })

    it('should exchange code for tokens successfully', async () => {
      mockedGoogleApi.post.mockResolvedValueOnce({
        data: {
          access_token: 'mock_access_token',
          refresh_token: 'mock_refresh_token',
          expires_in: 3600,
          id_token: 'mock_id_token',
        },
      })

      const response = await request(app)
        .post(`${API_BASE_PATH}${apiEndpoints.TOKEN}`)
        .send({ code: 'auth_code', codeVerifier: 'code_verifier' })

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('access_token', 'mock_access_token')
      expect(response.body).toHaveProperty('refresh_token', 'mock_refresh_token')
      expect(response.body).toHaveProperty('expires_in', 3600)
      expect(response.body).toHaveProperty('id_token', 'mock_id_token')
      expect(response.body).toHaveProperty('expires_at')

      expect(mockedGoogleApi.post).toHaveBeenCalledWith(
        GoogleOAuthEndpoints.TOKEN_EXCHANGE,
        expect.stringContaining('client_id=test_client_id')
      )
    })

    it('should handle token exchange failure from Google', async () => {
      mockedGoogleApi.post.mockRejectedValueOnce({
        response: {
          status: 401,
          data: { error: 'invalid_grant', error_description: 'Bad code' },
        },
      })

      const response = await request(app)
        .post(`${API_BASE_PATH}${apiEndpoints.TOKEN}`)
        .send({ code: 'bad_code', codeVerifier: 'code_verifier' })

      expect(response.status).toBe(401)
      expect(response.body.error).toBe(ErrorMessages.TOKEN_EXCHANGE_FAILED)
      expect(response.body.details.error).toBe('invalid_grant')
    })
  })

  describe(`POST ${API_BASE_PATH}${apiEndpoints.REFRESH}`, () => {
    it('should return 400 if refresh_token is missing', async () => {
      const response = await request(app).post(`${API_BASE_PATH}${apiEndpoints.REFRESH}`).send({})
      expect(response.status).toBe(400)
      expect(response.body.error).toBe(ErrorMessages.MISSING_REFRESH_TOKEN)
    })

    it('should refresh token successfully', async () => {
      mockedGoogleApi.post.mockResolvedValueOnce({
        data: {
          access_token: 'new_access_token',
          expires_in: 3600,
        },
      })

      const response = await request(app)
        .post(`${API_BASE_PATH}${apiEndpoints.REFRESH}`)
        .send({ refresh_token: 'mock_refresh_token' })

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('access_token', 'new_access_token')
      expect(response.body).toHaveProperty('expires_in', 3600)

      expect(mockedGoogleApi.post).toHaveBeenCalledWith(
        GoogleOAuthEndpoints.TOKEN_EXCHANGE,
        expect.stringContaining('grant_type=refresh_token')
      )
    })

    it('should handle refresh failure from Google', async () => {
      mockedGoogleApi.post.mockRejectedValueOnce({
        response: {
          status: 400,
          data: { error: 'invalid_grant', error_description: 'Invalid refresh token' },
        },
      })

      const response = await request(app)
        .post(`${API_BASE_PATH}${apiEndpoints.REFRESH}`)
        .send({ refresh_token: 'invalid_refresh_token' })

      expect(response.status).toBe(400)
      expect(response.body.error).toBe(ErrorMessages.REFRESH_FAILED)
      expect(response.body.details.error).toBe('invalid_grant')
    })
  })

  describe(`GET ${API_BASE_PATH}${apiEndpoints.VALIDATE}`, () => {
    it('should return 401 if Authorization header is missing', async () => {
      const response = await request(app).get(`${API_BASE_PATH}${apiEndpoints.VALIDATE}`)
      expect(response.status).toBe(401)
      expect(response.body.error).toBe(ErrorMessages.MISSING_AUTH_HEADER)
    })

    it('should return 401 if Authorization header is invalid', async () => {
      const response = await request(app)
        .get(`${API_BASE_PATH}${apiEndpoints.VALIDATE}`)
        .set('Authorization', 'InvalidToken')
      expect(response.status).toBe(401)
      expect(response.body.error).toBe(ErrorMessages.MISSING_AUTH_HEADER)
    })

    it('should validate token and return user info successfully', async () => {
      mockedGoogleApi.get.mockResolvedValueOnce({
        data: {
          id: 'google_id_123',
          email: 'test@example.com',
          name: 'Test User',
        },
      })

      const response = await request(app)
        .get(`${API_BASE_PATH}${apiEndpoints.VALIDATE}`)
        .set('Authorization', 'Bearer valid_access_token')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('id', 'google_id_123')
      expect(response.body).toHaveProperty('email', 'test@example.com')
      expect(response.body).toHaveProperty('name', 'Test User')

      expect(mockedGoogleApi.get).toHaveBeenCalledWith(
        GoogleOAuthEndpoints.USER_INFO,
        expect.objectContaining({
          headers: { Authorization: 'Bearer valid_access_token' },
        })
      )
    })

    it('should handle token validation failure from Google', async () => {
      mockedGoogleApi.get.mockRejectedValueOnce({
        response: {
          status: 401,
          data: { error: 'invalid_token', error_description: 'Token expired' },
        },
      })

      const response = await request(app)
        .get(`${API_BASE_PATH}${apiEndpoints.VALIDATE}`)
        .set('Authorization', 'Bearer expired_access_token')

      expect(response.status).toBe(401)
      expect(response.body.error).toBe(ErrorMessages.TOKEN_VALIDATION_FAILED)
      expect(response.body.details.error).toBe('invalid_token')
    })
  })
});
