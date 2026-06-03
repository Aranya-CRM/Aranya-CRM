import { http } from '../../../shared/api'
import { caseAuditLogMockData, caseFlagMockData, caseMockData, caseNoteMockData, caseStatusChangeMockData } from '../../../mocks/case.mock'
import type { AuditLogEntry, Case, CaseColorCode, CaseFlag, CaseNote, CaseStatus, CaseStatusChange } from '../types'

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

export async function createCase(data: Omit<Case, 'id'>): Promise<Case> {
  const mode = getDataMode()
  if (mode === 'mock') {
    const newCase = { ...data, id: `case-${Date.now()}` } as Case
    caseMockData.push(newCase)
    return newCase
  }

  try {
    const res = await http.post<Case>('/v1/cases', data)
    return res.data
  } catch {
    if (mode === 'auto') {
      const newCase = { ...data, id: `case-${Date.now()}` } as Case
      caseMockData.push(newCase)
      return newCase
    }
    throw new Error('Failed to create case')
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
    socialWorker: text(source.createdByName),
    status: mapCaseStatus(source.status),
    colorCode: mapCaseColorCode(source.colorCode),
    comments: text(source.comments ?? source.description),
    remarks: text(source.remarks),
    services: emptyServices(),
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

function emptyServices(): Case['services'] {
  return {
    housingSupport: false,
    financialAssistance: false,
    medicalTransportation: false,
    foodAssistance: false,
    legalAid: false,
    immigrationSupport: false,
    counselling: false,
    befriending: false,
    crisisIntervention: false,
    familyMediation: false,
    governmentLiaison: false,
    hospitalLiaison: false,
    documentAssistance: false,
    interpreterService: false,
    templeLiaison: false,
    communityReferral: false,
    religiousSupport: false,
  }
}
