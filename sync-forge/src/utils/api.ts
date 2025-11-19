import { ACCESS_TOKEN_KEY } from '@/constants/localStorageKeys'
import axios, { type AxiosError, type AxiosResponse, type InternalAxiosRequestConfig, type AxiosInstance } from 'axios'
import Logger from './logger'

export interface AxConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

interface QueueItem {
  resolve: (token: string) => void
  reject: (error: unknown) => void
}

export type TokenRefreshFn = () => Promise<string | null>

export interface ApiClient extends AxiosInstance {
  setRefreshTokenFn: (fn: TokenRefreshFn) => void
}

// eslint-disable-next-line max-lines-per-function
export const createApiClient = (): ApiClient => {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL

  if (!BACKEND_URL) {
    throw new Error(`VITE_BACKEND_URL is not set`)
  }

  let refreshTokenFn: TokenRefreshFn | undefined
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

  const api = axios.create({
    baseURL: BACKEND_URL,
    timeout: 10000
  }) as ApiClient

  api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY)
    if (token) {
      config.headers = config.headers || {}
      config.headers.Authorization = `Bearer ${token}`
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

  return api
}

const api = createApiClient()
export default api
