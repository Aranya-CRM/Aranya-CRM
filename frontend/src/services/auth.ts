import { http } from './http'

const ACCESS_TOKEN_KEY = 'aranya_access_token'
const REFRESH_TOKEN_KEY = 'aranya_refresh_token'
const USER_EMAIL_KEY = 'aranya_user_email'
const USER_NAME_KEY = 'aranya_user_name'

export interface LoginPayload {
  email: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresIn: number
  email: string
  fullName: string
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const response = await http.post<LoginResponse>('/v1/auth/login', payload)
  persistSession(response.data)
  return response.data
}

export function persistSession(session: LoginResponse): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, session.accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken)
  localStorage.setItem(USER_EMAIL_KEY, session.email)
  localStorage.setItem(USER_NAME_KEY, session.fullName)
}

export function clearSession(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(USER_EMAIL_KEY)
  localStorage.removeItem(USER_NAME_KEY)
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function isAuthenticated(): boolean {
  return Boolean(getAccessToken())
}

export function getCurrentUser() {
  return {
    email: localStorage.getItem(USER_EMAIL_KEY),
    fullName: localStorage.getItem(USER_NAME_KEY),
  }
}
