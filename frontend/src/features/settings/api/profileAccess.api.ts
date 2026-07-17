import { http } from '../../../shared/api/http'

/** 客户档案敏感区块(与后端 ClientProfileSection 对齐)。 */
export type ProfileSection =
  | 'IDENTITY'
  | 'PERSONAL'
  | 'ORDINATION'
  | 'MEMBERSHIP'
  | 'WELLBEING'
  | 'NEEDS'

export const PROFILE_SECTIONS: ProfileSection[] = [
  'IDENTITY', 'PERSONAL', 'ORDINATION', 'MEMBERSHIP', 'WELLBEING', 'NEEDS',
]

/**
 * 单个用户的档案敏感区块授权 —— 响应不含任何角色信息。
 * - sections :可编辑的额外授予(user_cap)
 * - inherited:用户已具备、不可在本页撤销的区块(角色基线),前端显示为勾选+锁定
 */
export interface ProfileAccess {
  sections: ProfileSection[]
  inherited: ProfileSection[]
}

export async function fetchProfileAccess(userId: number): Promise<ProfileAccess> {
  const res = await http.get<ProfileAccess>(`/admin/v1/users/${userId}/profile-access`)
  return res.data
}

/** 整集合替换该用户的档案区块授权。 */
export async function saveProfileAccess(userId: number, sections: ProfileSection[]): Promise<ProfileAccess> {
  const res = await http.put<ProfileAccess>(`/admin/v1/users/${userId}/profile-access`, { sections })
  return res.data
}
