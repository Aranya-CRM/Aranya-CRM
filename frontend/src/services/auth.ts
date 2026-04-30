import { http } from './http'

const ACCESS_TOKEN_KEY = 'aranya_access_token'
const REFRESH_TOKEN_KEY = 'aranya_refresh_token'
const USER_EMAIL_KEY = 'aranya_user_email'
const USER_NAME_KEY = 'aranya_user_name'
const USER_ROLES_KEY = 'aranya_user_roles'
// Legacy single-role key (pre roles[] migration). Kept here so we can clear it
// during clearSession; new sessions only write USER_ROLES_KEY.
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
  roles?: UserRole[]
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
  localStorage.setItem(USER_ROLES_KEY, JSON.stringify(session.roles ?? []))
}

export function clearSession(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(USER_EMAIL_KEY)
  localStorage.removeItem(USER_NAME_KEY)
  localStorage.removeItem(USER_ROLES_KEY)
  localStorage.removeItem(LEGACY_USER_ROLE_KEY)
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function isAuthenticated(): boolean {
  return Boolean(getAccessToken())
}

export function getUserRoles(): UserRole[] {
  const raw = localStorage.getItem(USER_ROLES_KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return parsed.filter((r): r is UserRole =>
          r === 'VOLUNTEER' || r === 'SOCIAL_WORKER' || r === 'MANAGER',
        )
      }
    } catch {
      // fall through to legacy / empty
    }
  }
  // One-time migration from the old singular key (e.g. existing dev sessions).
  const legacy = localStorage.getItem(LEGACY_USER_ROLE_KEY)
  if (legacy === 'VOLUNTEER' || legacy === 'SOCIAL_WORKER' || legacy === 'MANAGER') {
    return [legacy]
  }
  return []
}

export function hasRole(role: UserRole): boolean {
  return getUserRoles().includes(role)
}

export function hasAnyRole(...roles: UserRole[]): boolean {
  const owned = getUserRoles()
  return roles.some((r) => owned.includes(r))
}

export function getCurrentUser() {
  return {
    email: localStorage.getItem(USER_EMAIL_KEY),
    fullName: localStorage.getItem(USER_NAME_KEY),
    roles: getUserRoles(),
  }
}
