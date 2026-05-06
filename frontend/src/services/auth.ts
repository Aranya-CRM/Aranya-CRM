import { http } from './http'

const ACCESS_TOKEN_KEY = 'aranya_access_token'
const REFRESH_TOKEN_KEY = 'aranya_refresh_token'
// Legacy profile keys from older dev sessions. Nothing reads or writes them.
const LEGACY_USER_EMAIL_KEY = 'aranya_user_email'
const LEGACY_USER_NAME_KEY = 'aranya_user_name'

export interface LoginPayload {
  email: string
  password: string
}

export interface LoginResponse {
  accessToken?: string
  refreshToken?: string
  tokenType?: string
  expiresIn: number
  email: string
  fullName: string
  requiresTwoFactor?: boolean
  requiresTwoFactorSetup?: boolean
  tempToken?: string
  backupCodes?: string[]
}

export interface TwoFactorVerifyPayload {
  tempToken: string
  code: string
}

export interface TwoFactorSetupData {
  secret: string
  qrCodeBase64?: string
}

export interface TwoFactorInitEnablePayload {
  tempToken: string
  secret: string
  code: string
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const response = await http.post<LoginResponse>('/v1/auth/login', payload)
  persistSession(response.data)
  return response.data
}

/**
 * Persist auth tokens only. User identity and render instructions are NOT
 * cached in localStorage — AuthContext fetches them on demand.
 */
export function persistSession(session: LoginResponse): void {
  if (!session.accessToken || !session.refreshToken) {
    throw new Error('Cannot persist an incomplete login session')
  }
  localStorage.setItem(ACCESS_TOKEN_KEY, session.accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken)
}

export function clearSession(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  // Defensive cleanup of legacy keys from older sessions.
  localStorage.removeItem(LEGACY_USER_EMAIL_KEY)
  localStorage.removeItem(LEGACY_USER_NAME_KEY)
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function isAuthenticated(): boolean {
  return Boolean(getAccessToken())
}
