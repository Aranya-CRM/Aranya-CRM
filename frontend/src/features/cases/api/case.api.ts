import { http } from '../../../shared/api'
import { caseAuditLogMockData, caseFlagMockData, caseMockData, caseNoteMockData, caseStatusChangeMockData } from '../../../mocks/case.mock'
import { emptyCaseServices, type AuditLogEntry, type Case, type CaseColorCode, type CaseFlag, type CaseNote, type CaseServices, type CaseStatus, type CaseStatusChange, type ServiceEvent } from '../types'

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
  assignedUserId: string | number
  scheduledStart: string
  location?: string
}

function getDataMode(): 'mock' | 'api' | 'auto' {
  const mode = (import.meta.env.VITE_DATA_MODE ?? 'auto').toLowerCase()
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

export async function createCase(data: CreateCasePayload): Promise<Case> {
  const mode = getDataMode()
  if (mode === 'mock') {
    const newCase = { ...data, id: `case-${Date.now()}`, caseNo: `CASE-${Date.now()}`, dateOpened: data.openedAt, clientId: String(data.clientId), clientNameEn: '', clientNameChn: '', tradition: '', socialWorker: '', services: servicesFromKeys(data.services) } as Case
    caseMockData.push(newCase)
    return newCase
  }

  try {
    const res = await http.post<BackendCase>('/v1/cases', data)
    return mapBackendCase(res.data)
  } catch {
    if (mode === 'auto') {
      const newCase = { ...data, id: `case-${Date.now()}`, caseNo: `CASE-${Date.now()}`, dateOpened: data.openedAt, clientId: String(data.clientId), clientNameEn: '', clientNameChn: '', tradition: '', socialWorker: '', services: servicesFromKeys(data.services) } as Case
      caseMockData.push(newCase)
      return newCase
    }
    throw new Error('Failed to create case')
  }
}

export async function updateCaseServices(id: string, services: Array<keyof CaseServices>): Promise<Case> {
  const res = await http.patch<BackendCase>(`/v1/cases/${id}/services`, services)
  return mapBackendCase(res.data)
}

export async function createServiceEvent(caseId: string, data: CreateServiceEventPayload): Promise<ServiceEvent> {
  const res = await http.post<ServiceEvent>(`/v1/cases/${caseId}/service-events`, data)
  return res.data
}

export async function fetchAssignedServiceEvents(): Promise<ServiceEvent[]> {
  const res = await http.get<ServiceEvent[]>('/v1/tasks')
  return res.data
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

export async function fetchCaseAuditLog(caseId: string): Promise<AuditLogEntry[]> {
  const entries = caseAuditLogMockData.filter((e) => e.caseId === caseId)
  return [...entries].sort((a, b) => b.at.localeCompare(a.at))
}

export async function fetchCaseFlags(caseId: string): Promise<CaseFlag[]> {
  return caseFlagMockData.filter((f) => f.caseId === caseId)
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

function servicesFromKeys(keys: Array<keyof CaseServices>): CaseServices {
  const services = emptyCaseServices()
  keys.forEach((key) => {
    services[key] = true
  })
  return services
}
