import { googleApi } from '../utils/axios'
import { GoogleOAuthEndpoints, ErrorMessages } from '../constants'
import config from '../config'
import Logger from '../utils/logger'
import { getErrorMessage } from '../utils/errorHandler'
import { type TokenResponse, type UserInfo } from '../types'

export const exchangeCodeForToken = async (code: string, codeVerifier: string): Promise<TokenResponse> => {
  const params = new URLSearchParams({
    client_id: config.google.clientId!,
    client_secret: config.google.clientSecret!,
    redirect_uri: config.google.redirectUri,
    grant_type: `authorization_code`,
    code,
    code_verifier: codeVerifier
  })

  try {
    const response = await googleApi.post<TokenResponse>(
      GoogleOAuthEndpoints.TOKEN_EXCHANGE,
      params.toString()
    )
    return response.data
  } catch (error) {
    Logger.error(`${ErrorMessages.TOKEN_EXCHANGE_FAILED}:`, getErrorMessage(error))
    throw error
  }
}

export const refreshAccessToken = async (refreshToken: string): Promise<TokenResponse> => {
  const params = new URLSearchParams({
    client_id: config.google.clientId!,
    client_secret: config.google.clientSecret!,
    grant_type: `refresh_token`,
    refresh_token: refreshToken
  })

  try {
    const response = await googleApi.post<TokenResponse>(
      GoogleOAuthEndpoints.TOKEN_EXCHANGE,
      params.toString()
    )
    return response.data
  } catch (error) {
    Logger.error(`${ErrorMessages.REFRESH_FAILED}:`, getErrorMessage(error))
    throw error
  }
}

export const validateAccessToken = async (accessToken: string): Promise<UserInfo> => {
  try {
    const response = await googleApi.get<UserInfo>(GoogleOAuthEndpoints.USER_INFO, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    })
    return response.data
  } catch (error) {
    Logger.error(`${ErrorMessages.TOKEN_VALIDATION_FAILED}:`, getErrorMessage(error))
    throw error
  }
}
