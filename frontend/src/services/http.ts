import axios from 'axios'

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 10000,
})

/**
 * Inject Bearer token from localStorage on every outgoing request.
 *
 * Read directly from localStorage (not via getAccessToken()) to avoid an
 * import cycle with services/auth.ts.
 *
 * Note: when the auth team's Firebase integration lands, this interceptor
 * will likely be replaced or supplemented to source the token from Firebase
 * SDK's session instead. The contract on the backend side stays the same:
 * Authorization: Bearer <token>.
 */
http.interceptors.request.use((config) => {
  const token = localStorage.getItem('aranya_access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
