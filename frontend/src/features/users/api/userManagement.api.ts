import { http } from '../../../shared/api'
import type {
  InviteUserPayload,
  UpdateUserRolesPayload,
  UpdateUserStatusPayload,
  UserSummary,
} from '../types'

export async function fetchUsers(): Promise<UserSummary[]> {
  const res = await http.get<UserSummary[]>('/v1/users')
  return res.data
}

export async function inviteUser(data: InviteUserPayload): Promise<UserSummary> {
  const res = await http.post<UserSummary>('/v1/users/invite', data)
  return res.data
}

export async function updateUserRoles(
  id: number,
  data: UpdateUserRolesPayload,
): Promise<UserSummary> {
  const res = await http.patch<UserSummary>(`/v1/users/${id}/roles`, data)
  return res.data
}

export async function updateUserStatus(
  id: number,
  data: UpdateUserStatusPayload,
): Promise<UserSummary> {
  const res = await http.patch<UserSummary>(`/v1/users/${id}/status`, data)
  return res.data
}

export async function deleteUser(id: number): Promise<void> {
  await http.delete(`/v1/users/${id}`)
}
