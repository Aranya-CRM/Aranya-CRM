import { encodeHttpHeaderValue, http } from '../../../shared/api'
import { caseMockData, caseNoteMockData, caseStatusChangeMockData } from '../../../mocks/case.mock'
import { emptyCaseServices, type CalendarOption, type Case, type CaseColorCode, type CaseDocument, type CaseDocumentCategory, type CaseNote, type CaseServices, type CaseStatus, type CaseStatusChange, type DocumentDownloadUrl, type ServiceEvent, type SharedCalendarEvent } from '../types'

type BackendCase = {
  id: number | string
  caseCode?: string | null
  title?: string | null
  description?: string | null
  priority?: string | null
  status?: string | null
  colorCode?: string | null
  tradition?: string | null
  openedAt?: string | null
  closedAt?: string | null
  clientId?: number | string | null
  clientAbbr?: string | null
  clientNameEn?: string | null
  clientNameChn?: string | null
  venue?: string | null
  createdById?: number | string | null
  createdByName?: string | null
  comments?: string | null
  remarks?: string | null
  services?: Partial<Record<keyof CaseServices, boolean>> | null
  serviceEvents?: ServiceEvent[] | null
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

export interface ApprovalOptions {
  approverId?: number
  reason?: string
}

export interface UpdateCasePayload {
  status?: CaseStatus
  colorCode?: CaseColorCode
  socialWorkerId?: string | number
  comments?: string
  remarks?: string
}

export interface CreateCasePayload {
  clientId: string | number
  socialWorkerId?: string | number
  openedAt: string
  status: CaseStatus
  colorCode: CaseColorCode
  comments?: string
  remarks?: string
  services: Array<keyof CaseServices>
}

export interface CreateServiceEventPayload {
  serviceKey: keyof CaseServices
  calendarId?: string
  assignedUserId?: string | number
  scheduledStart: string
  scheduledEnd?: string
  reportDueAt?: string
  workDescription?: string
  notes?: string
  location?: string
  // 组织日历模板字段
  address?: string
  agenda?: string
  schedule?: string
  manpower?: string
  instructions?: string
}

function getDataMode(): 'mock' | 'api' | 'auto' {
  const mode = (import.meta.env.VITE_DATA_MODE ?? 'api').toLowerCase()
  if (mode === 'mock' || mode === 'api') return mode
  return 'auto'
}

export async function fetchCases(): Promise<Case[]> {
  const mode = getDataMode()
  if (mode === 'mock') return caseMockData

  try {
    const res = await http.get<BackendCase[]>('/v1/cases')
    return res.data.map(mapBackendCase)
  } catch {
    if (mode === 'auto') return caseMockData
    throw new Error('Failed to fetch cases')
  }
}

export async function fetchCaseById(id: string): Promise<Case | undefined> {
  const mode = getDataMode()
  if (mode === 'mock') return caseMockData.find((c) => c.id === id)

  try {
    const res = await http.get<BackendCase>(`/v1/cases/${id}`)
    return mapBackendCase(res.data)
  } catch {
    if (mode === 'auto') return caseMockData.find((c) => c.id === id)
    throw new Error('Failed to fetch case')
  }
}

function approvalRequestConfig(options?: ApprovalOptions) {
  const headers: Record<string, string> = {}
  if (options?.approverId) headers['X-Approver-Id'] = String(options.approverId)
  if (options?.reason?.trim()) headers['X-Approval-Reason'] = encodeHttpHeaderValue(options.reason.trim())
  return Object.keys(headers).length > 0 ? { headers } : undefined
}

export async function createCase(data: CreateCasePayload, options?: ApprovalOptions): Promise<ApprovalRequest> {
  const mode = getDataMode()
  if (mode === 'mock') {
    return mockApproval('CASE_CREATE', 'CLIENT', Number(data.clientId))
  }

  try {
    const res = await http.post<ApprovalRequest>('/v1/cases', data, approvalRequestConfig(options))
    return res.data
  } catch {
    if (mode === 'auto') {
      return mockApproval('CASE_CREATE', 'CLIENT', Number(data.clientId))
    }
    throw new Error('Failed to create case')
  }
}

export async function updateCaseServices(id: string, services: Array<keyof CaseServices>, options?: ApprovalOptions): Promise<ApprovalRequest> {
  const res = await http.patch<ApprovalRequest>(`/v1/cases/${id}/services`, services, approvalRequestConfig(options))
  return res.data
}

export async function deleteCase(id: string, options?: ApprovalOptions): Promise<ApprovalRequest> {
  const res = await http.delete<ApprovalRequest>(`/v1/cases/${id}`, approvalRequestConfig(options))
  return res.data
}

export async function createServiceEvent(caseId: string, data: CreateServiceEventPayload): Promise<ServiceEvent> {
  const res = await http.post<ServiceEvent>(`/v1/cases/${caseId}/service-events`, data)
  return res.data
}

export async function updateServiceEvent(
  caseId: string,
  eventId: string | number,
  data: CreateServiceEventPayload,
): Promise<ServiceEvent> {
  const res = await http.patch<ServiceEvent>(`/v1/cases/${caseId}/service-events/${eventId}`, data)
  return res.data
}

/** 手动重试将事件同步到 Google 共享日历(上次镜像失败时)。 */
export async function syncServiceEvent(caseId: string, eventId: string | number): Promise<ServiceEvent> {
  const res = await http.post<ServiceEvent>(`/v1/cases/${caseId}/service-events/${eventId}/sync`)
  return res.data
}

export async function deleteServiceEvent(caseId: string, eventId: string | number): Promise<void> {
  await http.delete(`/v1/cases/${caseId}/service-events/${eventId}`)
}

export async function fetchAssignedServiceEvents(): Promise<ServiceEvent[]> {
  const res = await http.get<ServiceEvent[]>('/v1/tasks')
  return res.data
}

/**
 * 拉取 Google 共享日历在 [from, to] 区间内的事件(后端已排除本 case 自己的事件)。
 * mock 模式或集成未启用时安全返回空数组。
 */
export async function fetchSharedCalendarEvents(
  caseId: string,
  fromIso: string,
  toIso: string,
): Promise<SharedCalendarEvent[]> {
  if (getDataMode() === 'mock') return []
  try {
    const res = await http.get<SharedCalendarEvent[]>(`/v1/cases/${caseId}/calendar-events`, {
      params: { from: fromIso, to: toIso },
    })
    return res.data ?? []
  } catch {
    return []
  }
}

/** 可写入的共享日历列表(供增添事件选择目标日历)。集成未启用/mock 时返回空。 */
export async function fetchCalendarOptions(): Promise<CalendarOption[]> {
  if (getDataMode() === 'mock') return []
  try {
    const res = await http.get<CalendarOption[]>('/v1/calendar/options')
    return res.data ?? []
  } catch {
    return []
  }
}

export async function updateCase(id: string, data: UpdateCasePayload): Promise<Case> {
  const mode = getDataMode()
  if (mode === 'mock') {
    const idx = caseMockData.findIndex((c) => c.id === id)
    if (idx === -1) throw new Error('Case not found')
    const updated = {
      ...caseMockData[idx],
      status: data.status ?? caseMockData[idx].status,
      colorCode: data.colorCode ?? caseMockData[idx].colorCode,
      socialWorkerId: data.socialWorkerId ? String(data.socialWorkerId) : caseMockData[idx].socialWorkerId,
      comments: data.comments ?? caseMockData[idx].comments,
      remarks: data.remarks ?? caseMockData[idx].remarks,
    }
    caseMockData[idx] = updated
    return updated
  }

  try {
    const res = await http.patch<BackendCase>(`/v1/cases/${id}`, data)
    return mapBackendCase(res.data)
  } catch {
    if (mode === 'auto') {
      const idx = caseMockData.findIndex((c) => c.id === id)
      if (idx === -1) throw new Error('Case not found')
      const updated = {
        ...caseMockData[idx],
        status: data.status ?? caseMockData[idx].status,
        colorCode: data.colorCode ?? caseMockData[idx].colorCode,
        socialWorkerId: data.socialWorkerId ? String(data.socialWorkerId) : caseMockData[idx].socialWorkerId,
        comments: data.comments ?? caseMockData[idx].comments,
        remarks: data.remarks ?? caseMockData[idx].remarks,
      }
      caseMockData[idx] = updated
      return updated
    }
    throw new Error('Failed to update case')
  }
}

export async function fetchCaseNotes(caseId: string, mine = false): Promise<CaseNote[]> {
  const mode = getDataMode()
  if (mode === 'mock') return caseNoteMockData.filter((n) => n.caseId === caseId)

  try {
    const res = await http.get<CaseNote[]>(`/v1/cases/${caseId}/notes`, { params: mine ? { mine: true } : undefined })
    return res.data
  } catch {
    if (mode === 'auto') return caseNoteMockData.filter((n) => n.caseId === caseId)
    throw new Error('Failed to fetch case notes')
  }
}

export interface CreateCaseNotePayload {
  caseId: string
  content: string
  followUp?: string
}

export interface UploadCaseDocumentPayload {
  caseId: string
  category: CaseDocumentCategory
  file: File
  displayName?: string
}

export type CaseDocumentUrlDisposition = 'attachment' | 'inline'

export async function createCaseNote(data: CreateCaseNotePayload): Promise<CaseNote> {
  const mode = getDataMode()
  if (mode === 'mock') {
    const note: CaseNote = {
      ...data,
      followUp: data.followUp ?? '',
      date: new Date().toISOString().slice(0, 10),
      recordedBy: 'Volunteer',
      id: `note-${Date.now()}`,
      createdAt: new Date().toISOString(),
    }
    caseNoteMockData.push(note)
    return note
  }

  try {
    const res = await http.post<CaseNote>(`/v1/cases/${data.caseId}/notes`, {
      content: data.content,
      followUp: data.followUp,
    })
    return res.data
  } catch {
    if (mode === 'auto') {
      const note: CaseNote = {
        ...data,
        followUp: data.followUp ?? '',
        date: new Date().toISOString().slice(0, 10),
        recordedBy: 'Volunteer',
        id: `note-${Date.now()}`,
        createdAt: new Date().toISOString(),
      }
      caseNoteMockData.push(note)
      return note
    }
    throw new Error('Failed to create case note')
  }
}

export async function deleteCaseNote(caseId: string, noteId: string): Promise<void> {
  const mode = getDataMode()
  if (mode === 'mock') {
    const index = caseNoteMockData.findIndex((note) => note.caseId === caseId && note.id === noteId)
    if (index >= 0) caseNoteMockData.splice(index, 1)
    return
  }

  try {
    await http.delete(`/v1/cases/${caseId}/notes/${noteId}`)
  } catch {
    if (mode === 'auto') {
      const index = caseNoteMockData.findIndex((note) => note.caseId === caseId && note.id === noteId)
      if (index >= 0) caseNoteMockData.splice(index, 1)
      return
    }
    throw new Error('Failed to delete case note')
  }
}

export async function fetchCaseDocuments(caseId: string): Promise<CaseDocument[]> {
  const mode = getDataMode()
  if (mode === 'mock') return []

  try {
    const res = await http.get<CaseDocument[]>(`/v1/cases/${caseId}/documents`)
    return res.data ?? []
  } catch {
    if (mode === 'auto') return []
    throw new Error('Failed to fetch case documents')
  }
}

export async function uploadCaseDocument(data: UploadCaseDocumentPayload): Promise<CaseDocument> {
  const formData = new FormData()
  formData.append('category', data.category)
  formData.append('file', data.file)
  if (data.displayName?.trim()) formData.append('displayName', data.displayName.trim())

  const res = await http.post<CaseDocument>(`/v1/cases/${data.caseId}/documents`, formData)
  return res.data
}

export async function fetchCaseDocumentDownloadUrl(caseId: string, documentId: number, disposition: CaseDocumentUrlDisposition = 'attachment'): Promise<DocumentDownloadUrl> {
  const res = await http.get<DocumentDownloadUrl>(`/v1/cases/${caseId}/documents/${documentId}/download-url`, {
    params: { disposition },
  })
  return res.data
}

export async function deleteCaseDocument(caseId: string, documentId: number): Promise<void> {
  await http.delete(`/v1/cases/${caseId}/documents/${documentId}`)
}

export async function fetchCaseStatusHistory(caseId: string): Promise<CaseStatusChange[]> {
  const mode = getDataMode()
  if (mode === 'mock') return caseStatusChangeMockData.filter((c) => c.caseId === caseId)

  try {
    const res = await http.get<CaseStatusChange[]>(`/v1/cases/${caseId}/status-history`)
    return res.data
  } catch {
    if (mode === 'auto') return caseStatusChangeMockData.filter((c) => c.caseId === caseId)
    throw new Error('Failed to fetch case status history')
  }
}

function mapBackendCase(source: BackendCase): Case {
  return {
    id: String(source.id),
    caseNo: text(source.caseCode),
    title: text(source.title),
    dateOpened: toDateOnly(source.openedAt),
    closedAt: source.closedAt ? toDateOnly(source.closedAt) : undefined,
    clientId: text(source.clientId),
    clientAbbr: text(source.clientAbbr),
    clientNameEn: text(source.clientNameEn),
    clientNameChn: text(source.clientNameChn),
    venue: text(source.venue),
    tradition: text(source.tradition),
    socialWorkerId: text(source.createdById),
    socialWorker: text(source.createdByName),
    status: mapCaseStatus(source.status),
    colorCode: mapCaseColorCode(source.colorCode),
    comments: text(source.comments ?? source.description),
    remarks: text(source.remarks),
    services: { ...emptyCaseServices(), ...(source.services ?? {}) },
    serviceEvents: source.serviceEvents ?? [],
  }
}

function text(value: string | number | null | undefined): string {
  return value === null || value === undefined ? '' : String(value)
}

function normalize(value: string | null | undefined): string {
  return text(value).trim().replaceAll('-', '_').toUpperCase()
}

function toDateOnly(value: string | null | undefined): string {
  return text(value).slice(0, 10)
}

function mapCaseStatus(value: string | null | undefined): CaseStatus {
  const normalized = normalize(value)
  if (normalized === 'SUSPENDED') return 'SUSPENDED'
  if (normalized === 'CLOSED') return 'CLOSED'
  return 'OPEN'
}

function mapCaseColorCode(value: string | null | undefined): CaseColorCode {
  const normalized = normalize(value)
  if (normalized === 'RED') return 'RED'
  if (normalized === 'ORANGE') return 'ORANGE'
  if (normalized === 'YELLOW') return 'YELLOW'
  if (normalized === 'GREY' || normalized === 'GRAY') return 'GREY'
  if (normalized === 'BLACK') return 'BLACK'
  return 'GREEN'
}

function mockApproval(type: string, targetType: string, targetId: number): ApprovalRequest {
  return {
    id: Date.now(),
    type,
    status: 'PENDING',
    targetType,
    targetId,
    payloadJson: '{}',
    requestedByName: 'Current User',
    createdAt: new Date().toISOString(),
  }
}
