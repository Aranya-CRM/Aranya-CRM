import axios from 'axios'
import { getFirebaseIdToken } from '../../features/auth/api/auth'

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 10000,
})

http.interceptors.request.use(async (config) => {
  const token = await getFirebaseIdToken()

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})
