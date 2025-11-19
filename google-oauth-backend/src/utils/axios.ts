import axios from 'axios'

export const googleApi = axios.create({
  timeout: 10000,
  headers: {
    'Content-Type': `application/x-www-form-urlencoded`
  }
})
