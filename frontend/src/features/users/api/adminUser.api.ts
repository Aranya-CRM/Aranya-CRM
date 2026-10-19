import { http } from '../../../shared/api'
import type {
  InviteUserPayload,
  UpdateUserRolesPayload,
  UpdateUserStatusPayload,
  UserSummary,
} from '../types'

// Settings「账号管理」—— 统一命中 /api/admin/v1/users(http baseURL = /api),
// 服务端按 admin:users.manage 权限拦截。
const BASE = '/admin/v1/users'

export async function fetchAdminUsers(): Promise<UserSummary[]> {
  const res = await http.get<UserSummary[]>(BASE)
  return res.data
}

export async function inviteUser(data: InviteUserPayload): Promise<UserSummary> {
  const res = await http.post<UserSummary>(`${BASE}/invite`, data)
  return res.data
}

/** 重发"设置密码"邮件;仅 INVITED 状态可重发,否则后端返回 409 NOT_INVITED。 */
export async function resendInvite(id: number): Promise<UserSummary> {
  const res = await http.post<UserSummary>(`${BASE}/${id}/resend-invite`)
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
