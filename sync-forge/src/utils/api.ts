import axios, { type AxiosError, type AxiosResponse, type InternalAxiosRequestConfig, type AxiosInstance } from 'axios'

export type TokenRefreshFn = () => Promise<string | null>

export interface ApiClient extends AxiosInstance {
  setRefreshTokenFn: (fn: TokenRefreshFn) => void
}

export const createApiClient = (): ApiClient => {
  let refreshToken: TokenRefreshFn | undefined

  const api = axios.create({
    timeout: 10000
  }) as ApiClient

  api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  })

  api.interceptors.response.use(
    (res: AxiosResponse) => res,
    async (err: AxiosError) => {
      if (err.response?.status === 401 && err.config && refreshToken) {
        const newToken = await refreshToken()
        if (newToken) {
          err.config.headers.Authorization = `Bearer ${newToken}`
          return api.request(err.config)
        }
      }
      return Promise.reject(err)
    }
  )

  api.setRefreshTokenFn = (fn: TokenRefreshFn) => {
    refreshToken = fn
  }

  return api
}

// Default instance (no auto-refresh yet)
const api = createApiClient()
export default api