import axios, { type AxiosInstance } from 'axios'

/**
 * Factory function to create a simple Axios instance.
 * Exported for testability.
 * @param baseURL The base URL for the authentication API.
 * @returns A simple Axios instance.
 */
export const createSimpleApiClient = (baseURL: string): AxiosInstance => {
  if (!baseURL) {
    throw new Error(`Cannot create API client without a baseURL`)
  }

  const api = axios.create({
    baseURL,
    timeout: 10000,
    withCredentials: true
  })

  // This client intentionally has NO interceptors for token refreshing,
  // as it is used for the authentication calls themselves (e.g., /token, /refresh).

  return api
}

const authApiUrl = import.meta.env.VITE_AUTH_API_URL

if (!authApiUrl) {
  throw new Error(`VITE_AUTH_API_URL is not defined. Please check your .env file.`)
}

/**
 * Singleton instance of the auth API client for the application to use.
 */
export const simpleApiClient = createSimpleApiClient(authApiUrl)
