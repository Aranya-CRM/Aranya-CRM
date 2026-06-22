import { http } from '../../../shared/api'
export interface MeResponse {
  id: number
  email: string
  fullName: string
  username?: string
  phone?: string | null
  emailVerified?: boolean
  status?: string
  createdAt?: string | null
}

/** Fetch the currently-authenticated user's basic profile. */
export async function getCurrentUser(): Promise<MeResponse> {
  const { data } = await http.get<MeResponse>('/v1/auth/me')
  return data
}
