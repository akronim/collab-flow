import { ApiEndpoints } from '@/constants/apiEndpoints'
import type { User } from '@/types/auth'
import ApiCallResult from '@/utils/apiCallResult'
import { apiClient } from '@/http/apiClient'

export const authApiService = {
  /**
   * Fetches the current user's data from the API.
   */
  async getUser(): Promise<ApiCallResult<User>> {
    try {
      const response = await apiClient.get<User>(ApiEndpoints.ME)
      return ApiCallResult.Success(response.data, response.status)
    } catch (error) {
      return ApiCallResult.Fail(error)
    }
  },

  /**
   * Calls the logout endpoint on the backend.
   */
  async logout(): Promise<ApiCallResult<void>> {
    try {
      const response = await apiClient.post(ApiEndpoints.AUTH_LOGOUT)
      return ApiCallResult.SuccessVoid(response.status)
    } catch (error) {
      return ApiCallResult.Fail(error)
    }
  },

  /**
   * Exchanges an authorization code and PKCE code verifier for a session.
   */
  async exchangeToken(
    code: string,
    codeVerifier: string
  ): Promise<ApiCallResult<void>> {
    try {
      const response = await apiClient.post(ApiEndpoints.AUTH_TOKEN, {
        code,
        codeVerifier
      })
      return ApiCallResult.SuccessVoid(response.status)
    } catch (error) {
      return ApiCallResult.Fail(error)
    }
  }
}
