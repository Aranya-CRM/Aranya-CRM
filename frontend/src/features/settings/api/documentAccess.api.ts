import { http } from '../../../shared/api/http'

/** 案例文件类别(与后端 DocumentCategory 对齐)。 */
export type DocumentCategory = 'ORDINATION' | 'MEDICAL' | 'FINANCIAL' | 'LEGAL'

export const DOCUMENT_CATEGORIES: DocumentCategory[] = ['ORDINATION', 'MEDICAL', 'FINANCIAL', 'LEGAL']

export interface DocumentAccess {
  userId: number
  categories: DocumentCategory[]
}

/** 读取某用户当前被授予的文件查看类别(附加权限)。 */
export async function fetchDocumentAccess(userId: number): Promise<DocumentAccess> {
  const res = await http.get<DocumentAccess>(`/admin/v1/settings/document-access/${userId}`)
  return res.data
}

/** 覆盖式设置某用户的文件查看类别授予。 */
export async function saveDocumentAccess(userId: number, categories: DocumentCategory[]): Promise<DocumentAccess> {
  const res = await http.put<DocumentAccess>(`/admin/v1/settings/document-access/${userId}`, { categories })
  return res.data
}
