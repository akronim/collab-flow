import axios from 'axios'

const AUTH_API_URL = import.meta.env.VITE_AUTH_API_URL

if (!AUTH_API_URL) {
  throw new Error('VITE_AUTH_API_URL is not set')
}

const authApi = axios.create({
  baseURL: AUTH_API_URL,
  timeout: 10000
})

export default authApi
