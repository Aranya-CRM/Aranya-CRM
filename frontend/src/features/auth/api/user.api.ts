import { http } from '../../../shared/api'
export interface MeResponse {
  id: number
  email: string
  fullName: string
}

/** Fetch the currently-authenticated user's basic profile. */
export async function getCurrentUser(): Promise<MeResponse> {
  const { data } = await http.get<MeResponse>('/v1/auth/me')
  return data
}
