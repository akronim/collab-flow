import axios, { type AxiosError, type AxiosResponse, type InternalAxiosRequestConfig, type AxiosInstance } from 'axios'

export interface AxConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

type QueueItem = {
  resolve: (token: string) => void
  reject: (error: unknown) => void
}

export type TokenRefreshFn = () => Promise<string | null>

export interface ApiClient extends AxiosInstance {
  setRefreshTokenFn: (fn: TokenRefreshFn) => void
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

export const createApiClient = (): ApiClient => {
  let refreshTokenFn: TokenRefreshFn | undefined
  let isRefreshing = false
  let failedQueue: QueueItem[] = []

  const processQueue = (error: unknown = null, token: string | null = null) => {
    failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error)
      } else if (token) {
        resolve(token)
      } else {
        reject(new Error('Token refresh failed'))
      }
    })
    failedQueue = []
  }

  const api = axios.create({
    baseURL: BACKEND_URL,
    timeout: 10000
  }) as ApiClient

  api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers = config.headers || {}
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  })

  api.interceptors.response.use(
    (res: AxiosResponse) => res,
    async (err: AxiosError) => {
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
          .catch(queueError => Promise.reject(queueError))
      }

      isRefreshing = true
      config._retry = true

      try {
        const newToken = await refreshTokenFn()

        if (!newToken) {
          const refreshError = new Error('Token refresh failed')
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
        console.error('Token refresh error:', refreshError)
        processQueue(refreshError)
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }
  )

  api.setRefreshTokenFn = (fn: TokenRefreshFn) => {
    refreshTokenFn = fn
  }

  return api
}

const api = createApiClient()
export default api