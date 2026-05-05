import { http } from './http'

const ACCESS_TOKEN_KEY = 'aranya_access_token'
const REFRESH_TOKEN_KEY = 'aranya_refresh_token'
// Legacy keys from the pre-decoupled-auth design where role/profile state was
// persisted in localStorage. Kept here only so clearSession can wipe stale
// values from existing dev sessions; nothing reads or writes them.
const LEGACY_USER_EMAIL_KEY = 'aranya_user_email'
const LEGACY_USER_NAME_KEY = 'aranya_user_name'
const LEGACY_USER_ROLES_KEY = 'aranya_user_roles'
const LEGACY_USER_ROLE_KEY = 'aranya_user_role'

export type UserRole = 'VOLUNTEER' | 'SOCIAL_WORKER' | 'MANAGER'

export const ALL_ROLES: UserRole[] = ['VOLUNTEER', 'SOCIAL_WORKER', 'MANAGER']

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
  const needsAction = response.data.requiresTwoFactor || response.data.requiresTwoFactorSetup
  if (!needsAction) {
    persistSession(response.data)
  }
  return response.data
}

export async function verifyTwoFactor(payload: TwoFactorVerifyPayload): Promise<LoginResponse> {
  const response = await http.post<LoginResponse>('/v1/auth/2fa/verify', payload)
  persistSession(response.data)
  return response.data
}

export async function setupTwoFactorInit(tempToken: string): Promise<TwoFactorSetupData> {
  const response = await http.post<TwoFactorSetupData>('/v1/auth/2fa/setup-init', { tempToken })
  return response.data
}

export async function enableTwoFactorInit(payload: TwoFactorInitEnablePayload): Promise<LoginResponse> {
  const response = await http.post<LoginResponse>('/v1/auth/2fa/enable-init', payload)
  persistSession(response.data)
  return response.data
}

/**
 * Persist auth tokens only. User identity and roles are NOT cached in
 * localStorage — AuthContext fetches them from `/users/me` on demand.
 */
export function persistSession(session: LoginResponse): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, session.accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken)
}

export function clearSession(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  // Defensive cleanup of legacy keys from older sessions.
  localStorage.removeItem(LEGACY_USER_EMAIL_KEY)
  localStorage.removeItem(LEGACY_USER_NAME_KEY)
  localStorage.removeItem(LEGACY_USER_ROLES_KEY)
  localStorage.removeItem(LEGACY_USER_ROLE_KEY)
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function isAuthenticated(): boolean {
  return Boolean(getAccessToken())
}
