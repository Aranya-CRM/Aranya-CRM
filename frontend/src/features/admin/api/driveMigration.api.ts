import { http } from '../../../shared/api'
import type { CaseDocumentCategory } from '../../cases/types'

export interface DriveEntry {
  id: string
  name: string
  mimeType: string
  size?: number | null
  modifiedTime?: string | null
  folder: boolean
  /** Google 原生文档导入时导出的格式(如 PDF/XLSX);普通文件为空 */
  exportAs?: string | null
}

export interface DriveImportItem {
  driveFileId: string
  caseId: number
  category: CaseDocumentCategory
  displayName?: string
}

export interface DriveImportResult {
  driveFileId: string
  status: 'IMPORTED' | 'SKIPPED' | 'FAILED'
  caseId?: number | null
  fileName?: string | null
  documentId?: number | null
  message?: string | null
}

export async function listDriveFiles(folderId?: string): Promise<DriveEntry[]> {
  const { data } = await http.get<DriveEntry[]>('/v1/admin/drive/files', {
    params: folderId ? { folderId } : undefined,
  })
  return data
}

export async function importDriveFiles(items: DriveImportItem[]): Promise<DriveImportResult[]> {
  const { data } = await http.post<DriveImportResult[]>('/v1/admin/drive/import', { items })
  return data
}
