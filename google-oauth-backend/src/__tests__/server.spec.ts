import { describe, it, expect, vi, beforeEach, Mocked } from 'vitest'
import request from 'supertest'
import app from '@/server' 
import axios from 'axios'

vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}))

const mockedAxios = axios as Mocked<typeof axios>

describe('Backend API Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.GOOGLE_CLIENT_ID = 'test_client_id'
    process.env.GOOGLE_CLIENT_SECRET = 'test_client_secret'
    process.env.REDIRECT_URI = 'http://localhost:5173/auth/callback'
  })

  describe('GET /', () => {
    it('responds with a success message', async () => {
      const response = await request(app).get('/')
      expect(response.status).toBe(200)
      expect(response.body).toEqual({ status: 'OK', message: 'OAuth Backend Running' })
    })
  })

  describe('POST /api/auth/token', () => {
    it('should return 400 if code or codeVerifier is missing', async () => {
      const response1 = await request(app).post('/api/auth/token').send({ code: 'some_code' })
      expect(response1.status).toBe(400)
      expect(response1.body.message).toBe('Missing code or codeVerifier')

      const response2 = await request(app).post('/api/auth/token').send({ codeVerifier: 'some_verifier' })
      expect(response2.status).toBe(400)
      expect(response2.body.message).toBe('Missing code or codeVerifier')
    })

    it('should exchange code for tokens successfully', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          access_token: 'mock_access_token',
          refresh_token: 'mock_refresh_token',
          expires_in: 3600,
          id_token: 'mock_id_token',
        },
      })

      const response = await request(app)
        .post('/api/auth/token')
        .send({ code: 'auth_code', codeVerifier: 'code_verifier' })

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('access_token', 'mock_access_token')
      expect(response.body).toHaveProperty('refresh_token', 'mock_refresh_token')
      expect(response.body).toHaveProperty('expires_in', 3600)
      expect(response.body).toHaveProperty('id_token', 'mock_id_token')
      expect(response.body).toHaveProperty('expires_at')

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/token',
        expect.stringContaining('client_id=test_client_id'),
        expect.any(Object)
      )
    })

    it('should handle token exchange failure from Google', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        response: {
          status: 401,
          data: { error: 'invalid_grant', error_description: 'Bad code' },
        },
      })

      const response = await request(app)
        .post('/api/auth/token')
        .send({ code: 'bad_code', codeVerifier: 'code_verifier' })

      expect(response.status).toBe(401)
      expect(response.body.error).toBe('Token exchange failed')
      expect(response.body.details.error).toBe('invalid_grant')
    })
  })

  describe('POST /api/auth/refresh', () => {
    it('should return 400 if refresh_token is missing', async () => {
      const response = await request(app).post('/api/auth/refresh').send({})
      expect(response.status).toBe(400)
      expect(response.body.error).toBe('Missing refresh_token')
    })

    it('should refresh token successfully', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          access_token: 'new_access_token',
          expires_in: 3600,
        },
      })

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refresh_token: 'mock_refresh_token' })

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('access_token', 'new_access_token')
      expect(response.body).toHaveProperty('expires_in', 3600)

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/token',
        expect.stringContaining('grant_type=refresh_token'),
        expect.any(Object)
      )
    })

    it('should handle refresh failure from Google', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        response: {
          status: 400,
          data: { error: 'invalid_grant', error_description: 'Invalid refresh token' },
        },
      })

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refresh_token: 'invalid_refresh_token' })

      expect(response.status).toBe(400)
      expect(response.body.error).toBe('Refresh failed')
      expect(response.body.details.error).toBe('invalid_grant')
    })
  })

  describe('GET /api/auth/validate', () => {
    it('should return 401 if Authorization header is missing', async () => {
      const response = await request(app).get('/api/auth/validate')
      expect(response.status).toBe(401)
      expect(response.body.error).toBe('Missing or invalid Authorization header')
    })

    it('should return 401 if Authorization header is invalid', async () => {
      const response = await request(app)
        .get('/api/auth/validate')
        .set('Authorization', 'InvalidToken')
      expect(response.status).toBe(401)
      expect(response.body.error).toBe('Missing or invalid Authorization header')
    })

    it('should validate token and return user info successfully', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          id: 'google_id_123',
          email: 'test@example.com',
          name: 'Test User',
        },
      })

      const response = await request(app)
        .get('/api/auth/validate')
        .set('Authorization', 'Bearer valid_access_token')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('id', 'google_id_123')
      expect(response.body).toHaveProperty('email', 'test@example.com')
      expect(response.body).toHaveProperty('name', 'Test User')

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        expect.objectContaining({
          headers: { Authorization: 'Bearer valid_access_token' },
        })
      )
    })

    it('should handle token validation failure from Google', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: {
          status: 401,
          data: { error: 'invalid_token', error_description: 'Token expired' },
        },
      })

      const response = await request(app)
        .get('/api/auth/validate')
        .set('Authorization', 'Bearer expired_access_token')

      expect(response.status).toBe(401)
      expect(response.body.error).toBe('Token validation failed')
      expect(response.body.details.error).toBe('invalid_token')
    })
  })
})
