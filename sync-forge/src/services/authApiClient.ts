import axios, { type AxiosError, type AxiosResponse, type InternalAxiosRequestConfig, type AxiosInstance } from 'axios'
import Logger from '@/utils/logger'

export interface AxConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

interface QueueItem {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}

export type TokenRefreshFn = () => Promise<string | null>
export type TokenGetFn = () => string | null

export interface AuthApiClient extends AxiosInstance {
  setRefreshTokenFn: (fn: TokenRefreshFn) => void;
  setGetTokenFn: (fn: TokenGetFn) => void;
}

let refreshTokenFn: TokenRefreshFn | undefined
let getTokenFn: TokenGetFn | undefined
let isRefreshing = false
let failedQueue: QueueItem[] = []

const processQueue = (error: unknown = null, token: string | null = null): void => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error)
    } else if (token) {
      resolve(token)
    } else {
      reject(new Error(`Token refresh failed`))
    }
  })
  failedQueue = []
}

/**
 * Factory function to create an Axios client for the main application API.
 * It includes interceptors to handle token attachment and refreshing.
 * @param baseURL The base URL for the main application API.
 * @returns A "smart" Axios instance with interceptors.
 */
// eslint-disable-next-line max-lines-per-function
export const createAuthApiClient = (baseURL: string): AuthApiClient => {
  if (!baseURL) {
    throw new Error(`Cannot create API client without a baseURL`)
  }

  const api = axios.create({
    baseURL,
    timeout: 10000
  }) as AuthApiClient

  api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    if (getTokenFn) {
      const token = getTokenFn()
      if (token) {
        config.headers = config.headers || {}
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  })

  // eslint-disable-next-line max-lines-per-function
  const errRespInterceptor = async (err: AxiosError): Promise<unknown> => {
    const config = err.config as AxConfig

    if (err.response?.status !== 401 || !config || !refreshTokenFn) {
      return Promise.reject(err)
    }

    if (config._retry) {
      return Promise.reject(err)
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        config._retry = true
        failedQueue.push({ resolve, reject })
      })
        .then(token => {
          const retryConfig = {
            ...config,
            headers: { ...config.headers, Authorization: `Bearer ${token}` }
          }
          return api.request(retryConfig)
        })
        .catch(queueError => {
          const error = queueError instanceof Error ? queueError : new Error(String(queueError))
          return Promise.reject(error)
        })
    }

    isRefreshing = true
    config._retry = true

    try {
      const newToken = await refreshTokenFn()

      if (!newToken) {
        const refreshError = new Error(`Token refresh failed`)
        processQueue(refreshError)
        return Promise.reject(refreshError)
      }

      processQueue(null, newToken)

      const retryConfig = {
        ...config,
        headers: { ...config.headers, Authorization: `Bearer ${newToken}` }
      }
      return api.request(retryConfig)
    } catch (refreshError) {
      Logger.error(`Token refresh error:`, refreshError)
      processQueue(refreshError)
      const error = refreshError instanceof Error ? refreshError : new Error(String(refreshError))
      return Promise.reject(error)
    } finally {
      isRefreshing = false
    }
  }

  api.interceptors.response.use((res: AxiosResponse) => res, errRespInterceptor)

  api.setRefreshTokenFn = (fn: TokenRefreshFn): void => {
    refreshTokenFn = fn
  }

  api.setGetTokenFn = (fn: TokenGetFn): void => {
    getTokenFn = fn
  }

  return api
}

const gatewayApiUrl = import.meta.env.VITE_GATEWAY_API_URL

if (!gatewayApiUrl) {
  throw new Error(`VITE_GATEWAY_API_URL is not defined. Please check your .env file.`)
}

/**
 * Singleton instance of the "smart" API client for the application to use.
 */
export const authApiClient = createAuthApiClient(gatewayApiUrl)
