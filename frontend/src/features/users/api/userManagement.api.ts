import { http } from '../../../shared/api'
import type { UserSummary } from '../types'

/**
 * 只读的可指派用户列表 —— 供派工负责人下拉、审批指派、Settings 选人等场景使用。
 * 账号管理写操作(邀请/角色/状态/删除)由后端 /api/admin/v1/users 提供,前端管理界面已下线。
 */
export async function fetchUsers(): Promise<UserSummary[]> {
  const res = await http.get<UserSummary[]>('/v1/users')
  return res.data
}
