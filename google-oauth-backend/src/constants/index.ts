export const apiEndpoints = {
  TOKEN: `/auth/token`,
  REFRESH: `/auth/refresh`,
  VALIDATE: `/auth/validate`
}

export const GoogleOAuthEndpoints = {
  TOKEN_EXCHANGE: `https://oauth2.googleapis.com/token`,
  USER_INFO: `https://www.googleapis.com/oauth2/v2/userinfo`
}

export const ErrorMessages = {
  UNEXPECTED_ERROR: `An unexpected error occurred`,
  TOKEN_EXCHANGE_FAILED: `Token exchange failed`,
  REFRESH_FAILED: `Refresh failed`,
  TOKEN_VALIDATION_FAILED: `Token validation failed`,
  BAD_REQUEST: `Bad Request`,
  UNAUTHORIZED: `Unauthorized`,
  MISSING_REFRESH_TOKEN: `Missing refresh_token`,
  MISSING_AUTH_HEADER: `Missing or invalid Authorization header`,
  MISSING_CODE_OR_VERIFIER: `Missing code or codeVerifier`
}
