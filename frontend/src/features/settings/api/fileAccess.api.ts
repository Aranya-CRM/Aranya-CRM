import { http } from '../../../shared/api/http'

/** 敏感文件类别(与后端 DocumentCategory 对齐;ORDINATION 即"身份"类)。 */
export type DocumentCategory = 'ORDINATION' | 'MEDICAL' | 'FINANCIAL' | 'LEGAL'

export const DOCUMENT_CATEGORIES: DocumentCategory[] = ['ORDINATION', 'MEDICAL', 'FINANCIAL', 'LEGAL']

/**
 * 单个用户的敏感文件访问授权 —— 响应不含任何角色信息。
 * - categories:可编辑的额外授予(user_cap)
 * - inherited :用户已具备、不可在本页撤销的类别(角色基线),前端显示为勾选+锁定
 */
export interface FileAccess {
  categories: DocumentCategory[]
  inherited: DocumentCategory[]
}

export async function fetchFileAccess(userId: number): Promise<FileAccess> {
  const res = await http.get<FileAccess>(`/admin/v1/users/${userId}/file-access`)
  return res.data
}

/** 整集合替换该用户的授权类别。 */
export async function saveFileAccess(userId: number, categories: DocumentCategory[]): Promise<FileAccess> {
  const res = await http.put<FileAccess>(`/admin/v1/users/${userId}/file-access`, { categories })
  return res.data
}
