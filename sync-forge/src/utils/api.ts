import axios, { type AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'

export type TokenRefreshFn = () => Promise<string | null>

export const createApiClient = (refreshToken?: TokenRefreshFn) => {
  const api = axios.create({
    timeout: 10000
  })

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

  return api
}

// Default instance (no auto-refresh yet)
const api = createApiClient()
export default api