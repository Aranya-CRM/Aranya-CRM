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

export interface ApprovalOptions {
  approverId?: number
}

export interface ApprovalRequest {
  id: number
  type: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
  targetType?: string | null
  targetId?: number | null
  targetLabel?: string | null
  payloadJson?: string | null
  requestedById?: number | null
  requestedByName?: string | null
  assignedApproverId?: number | null
  assignedApproverName?: string | null
  createdAt?: string | null
}

export async function deleteUser(id: number, options?: ApprovalOptions): Promise<ApprovalRequest> {
  const res = await http.delete<ApprovalRequest>(`/v1/users/${id}`, {
    headers: options?.approverId ? { 'X-Approver-Id': String(options.approverId) } : undefined,
  })
  return res.data
}
