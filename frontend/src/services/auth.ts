import { http } from './http'

const ACCESS_TOKEN_KEY = 'aranya_access_token'
const REFRESH_TOKEN_KEY = 'aranya_refresh_token'
const USER_EMAIL_KEY = 'aranya_user_email'
const USER_NAME_KEY = 'aranya_user_name'
const USER_ROLE_KEY = 'aranya_user_role'

export type UserRole = 'SOCIAL_WORKER' | 'VOLUNTEER'

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
  role?: UserRole
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
  qrCodeUri: string
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

export function persistSession(session: LoginResponse): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, session.accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken)
  localStorage.setItem(USER_EMAIL_KEY, session.email)
  localStorage.setItem(USER_NAME_KEY, session.fullName)
  localStorage.setItem(USER_ROLE_KEY, session.role ?? 'SOCIAL_WORKER')
}

export function clearSession(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(USER_EMAIL_KEY)
  localStorage.removeItem(USER_NAME_KEY)
  localStorage.removeItem(USER_ROLE_KEY)
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function isAuthenticated(): boolean {
  return Boolean(getAccessToken())
}

export function getUserRole(): UserRole {
  return (localStorage.getItem(USER_ROLE_KEY) as UserRole) ?? 'SOCIAL_WORKER'
}

export function getCurrentUser() {
  return {
    email: localStorage.getItem(USER_EMAIL_KEY),
    fullName: localStorage.getItem(USER_NAME_KEY),
    role: getUserRole(),
  }
}
