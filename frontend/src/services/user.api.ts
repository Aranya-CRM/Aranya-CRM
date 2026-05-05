import { http } from './http'
import type { UserRole } from './auth'

export interface MeResponse {
  id: number
  email: string
  fullName: string
  roles: UserRole[]
}

/**
 * Fetch the currently-authenticated user's profile and roles.
 *
 * Called by AuthContext on app init (if a token exists) and after every
 * successful login flow (incl. 2FA verify / setup). The backend resolves
 * the caller from SecurityContext.principal — we don't pass any identity
 * in the request body.
 */
export async function getCurrentUser(): Promise<MeResponse> {
  const { data } = await http.get<MeResponse>('/v1/users/me')
  return data
}
