import { http } from '../../../shared/api'
import type {
  InviteUserPayload,
  UpdateUserRolesPayload,
  UpdateUserStatusPayload,
  UserSummary,
} from '../../users/types'

// Admin Dashboard 账号管理 —— 统一命中 /api/admin/v1/users(http baseURL = /api)。
const BASE = '/admin/v1/users'

export async function fetchAdminUsers(): Promise<UserSummary[]> {
  const res = await http.get<UserSummary[]>(BASE)
  return res.data
}

export async function inviteUser(data: InviteUserPayload): Promise<UserSummary> {
  const res = await http.post<UserSummary>(`${BASE}/invite`, data)
  return res.data
}

export async function updateUserRoles(id: number, data: UpdateUserRolesPayload): Promise<UserSummary> {
  const res = await http.patch<UserSummary>(`${BASE}/${id}/roles`, data)
  return res.data
}

export async function updateUserStatus(id: number, data: UpdateUserStatusPayload): Promise<UserSummary> {
  const res = await http.patch<UserSummary>(`${BASE}/${id}/status`, data)
  return res.data
}

export async function deleteUser(id: number): Promise<void> {
  await http.delete(`${BASE}/${id}`)
}
