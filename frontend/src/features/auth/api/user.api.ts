import { http } from '../../../shared/api'
export interface MeResponse {
  id: number
  email: string
  fullName: string
  username?: string
  phone?: string | null
  emailVerified?: boolean
  status?: string
  /** 界面语言偏好 zh/en;null = 未设置,前端按浏览器/默认兜底 */
  preferredLanguage?: string | null
  createdAt?: string | null
}

/** Fetch the currently-authenticated user's basic profile. */
export async function getCurrentUser(): Promise<MeResponse> {
  const { data } = await http.get<MeResponse>('/v1/auth/me')
  return data
}

/** Persist the current user's UI language preference (follows the account across devices). */
export async function updateMyLanguage(language: 'zh' | 'en'): Promise<MeResponse> {
  const { data } = await http.patch<MeResponse>('/v1/auth/me/language', { language })
  return data
}
