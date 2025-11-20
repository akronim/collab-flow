import { describe, it, expect, vi, beforeEach, type Mocked } from 'vitest'

vi.mock(`../../utils/axios`, () => ({
  googleApi: {
    post: vi.fn(),
    get: vi.fn()
  }
}))

vi.mock(`../../config`, () => ({
  default: {
    google: {
      clientId: `test_client_id`,
      clientSecret: `test_client_secret`,
      redirectUri: `http://localhost:5173/auth/callback`
    }
  }
}))

import { googleApi } from '../../utils/axios'
import { exchangeCodeForToken, refreshAccessToken, validateAccessToken } from '../../services/auth.service'
import { GoogleOAuthEndpoints } from '../../constants'

const mockedGoogleApi = googleApi as Mocked<typeof googleApi>

describe(`auth.service`, () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe(`exchangeCodeForToken`, () => {
    it(`posts correct params and returns token data on success`, async () => {
      const tokenData = {
        access_token: `a`,
        refresh_token: `r`,
        expires_in: 3600,
        id_token: `id`
      }

      mockedGoogleApi.post.mockResolvedValueOnce({ data: tokenData } as any)

      const res = await exchangeCodeForToken(`code123`, `verifier123`)

      expect(res).toEqual(tokenData)
      expect(mockedGoogleApi.post).toHaveBeenCalledTimes(1)
      const [endpoint, body] = mockedGoogleApi.post.mock.calls[0]
      expect(endpoint).toBe(GoogleOAuthEndpoints.TOKEN_EXCHANGE)
      expect(body).toContain(`client_id=test_client_id`)
      expect(body).toContain(`client_secret=test_client_secret`)
      expect(body).toContain(`redirect_uri=http%3A%2F%2Flocalhost%3A5173%2Fauth%2Fcallback`)
      expect(body).toContain(`grant_type=authorization_code`)
      expect(body).toContain(`code=code123`)
      expect(body).toContain(`code_verifier=verifier123`)
    })

    it(`logs and rethrows on error`, async () => {
      const err = new Error(`network`)
      mockedGoogleApi.post.mockRejectedValueOnce(err)

      await expect(exchangeCodeForToken(`c`, `v`)).rejects.toThrow(err)
      expect(mockedGoogleApi.post).toHaveBeenCalled()
    })
  })

  describe(`refreshAccessToken`, () => {
    it(`posts correct params and returns refreshed token`, async () => {
      const tokenData = { access_token: `new`, expires_in: 3600 }
      mockedGoogleApi.post.mockResolvedValueOnce({ data: tokenData } as any)

      const res = await refreshAccessToken(`refresh-token-123`)

      expect(res).toEqual(tokenData)
      expect(mockedGoogleApi.post).toHaveBeenCalledTimes(1)
      const [endpoint, body] = mockedGoogleApi.post.mock.calls[0]
      expect(endpoint).toBe(GoogleOAuthEndpoints.TOKEN_EXCHANGE)
      expect(body).toContain(`client_id=test_client_id`)
      expect(body).toContain(`client_secret=test_client_secret`)
      expect(body).toContain(`grant_type=refresh_token`)
      expect(body).toContain(`refresh_token=refresh-token-123`)
    })

    it(`logs and rethrows on error`, async () => {
      const err = new Error(`refresh-fail`)
      mockedGoogleApi.post.mockRejectedValueOnce(err)

      await expect(refreshAccessToken(`rt`)).rejects.toThrow(err)
      expect(mockedGoogleApi.post).toHaveBeenCalled()
    })
  })

  describe(`validateAccessToken`, () => {
    it(`calls user info endpoint with Authorization header and returns user data`, async () => {
      const user = { id: `u1`, email: `e@test`, name: `User` }
      mockedGoogleApi.get.mockResolvedValueOnce({ data: user } as any)

      const res = await validateAccessToken(`atoken`)

      expect(res).toEqual(user)
      expect(mockedGoogleApi.get).toHaveBeenCalledTimes(1)
      const [endpoint, options] = mockedGoogleApi.get.mock.calls[0]
      expect(endpoint).toBe(GoogleOAuthEndpoints.USER_INFO)
      expect(options).toHaveProperty(`headers`)
      expect(options?.headers).toHaveProperty(`Authorization`, `Bearer atoken`)
    })

    it(`logs and rethrows on error`, async () => {
      const err = new Error(`invalid`)
      mockedGoogleApi.get.mockRejectedValueOnce(err)

      await expect(validateAccessToken(`bad`)).rejects.toThrow(err)
      expect(mockedGoogleApi.get).toHaveBeenCalled()
    })
  })
})
