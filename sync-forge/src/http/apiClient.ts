import { ApiEndpoints } from '@/constants/apiEndpoints'
import type { Router } from 'vue-router'
import axios, { AxiosError, type AxiosInstance } from 'axios'
import Logger from '@/utils/logger'

export const CSRF_COOKIE_NAME = `collabflow.csrf`
export const CSRF_HEADER_NAME = `x-csrf-token`

export interface CollabApiClient extends AxiosInstance {
  injectRouter: (router: Router) => void;
}

const getCsrfToken = (): string | undefined => {
  const match = new RegExp(`${CSRF_COOKIE_NAME}=([^;]+)`).exec(document.cookie)
  return match?.[1]
}

// eslint-disable-next-line max-lines-per-function
export const createApiClient = (baseURL: string): CollabApiClient => {
  if (!baseURL) {
    throw new Error(`Cannot create API client without a baseURL`)
  }

  const apiClient = axios.create({
    baseURL,
    withCredentials: true
  }) as CollabApiClient

  let router: Router | undefined

  // Attach the injector function to the instance
  apiClient.injectRouter = (r: Router): void => {
    router = r
  }

  // Attach CSRF token to state-changing requests
  apiClient.interceptors.request.use((config) => {
    if ([`POST`, `PUT`, `PATCH`, `DELETE`].includes(config.method?.toUpperCase() ?? ``)) {
      const csrfToken = getCsrfToken()
      if (csrfToken) {
        config.headers[CSRF_HEADER_NAME] = csrfToken
      }
    }
    return config
  })

  // 401 = session expired, redirect to login
  // Exception: /api/auth/me is expected to return 401 for unauthenticated users
  apiClient.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      const isAuthMeEndpoint = error.config?.url?.includes(ApiEndpoints.ME)
      if (error.response?.status === 401 && !isAuthMeEndpoint) {
        Logger.log(`[api client] 401 | router exists: ${router != null}`)
        if (router) {
          // Use void to explicitly mark promise as intentionally not awaited
          void router.push(`/login`)
        } else {
          // Fallback if router is not injected for some reason
          window.location.href = `/login`
        }
      }
      return Promise.reject(error)
    }
  )

  return apiClient
}

const gatewayApiUrl = import.meta.env.VITE_GATEWAY_API_URL

if (!gatewayApiUrl) {
  throw new Error(`VITE_GATEWAY_API_URL is not defined. Please check your .env file.`)
}

export const apiClient = createApiClient(gatewayApiUrl)
