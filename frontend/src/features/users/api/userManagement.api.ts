import { http } from '../../../shared/api'
import type { UserSummary } from '../types'

/**
 * 只读的可指派用户列表 —— 供派工负责人下拉、审批指派等非管理场景使用。
 * 账号管理写操作(邀请/角色/状态/删除)见 features/admin/api/adminUser.api.ts。
 */
export async function fetchUsers(): Promise<UserSummary[]> {
  const res = await http.get<UserSummary[]>('/v1/users')
  return res.data
}
