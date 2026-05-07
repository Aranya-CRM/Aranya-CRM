import { http } from '../../../shared/api'
import { caseMockData, caseNoteMockData, caseStatusChangeMockData } from '../../../mocks/case.mock'
import type { Case, CaseNote, CaseStatusChange } from '../types'

function getDataMode(): 'mock' | 'api' | 'auto' {
  const mode = (import.meta.env.VITE_DATA_MODE ?? 'auto').toLowerCase()
  if (mode === 'mock' || mode === 'api') return mode
  return 'auto'
}

export async function fetchCases(): Promise<Case[]> {
  const mode = getDataMode()
  if (mode === 'mock') return caseMockData

  try {
    const res = await http.get<Case[]>('/v1/cases')
    return res.data
  } catch {
    if (mode === 'auto') return caseMockData
    throw new Error('Failed to fetch cases')
  }
}

export async function fetchCaseById(id: string): Promise<Case | undefined> {
  const mode = getDataMode()
  if (mode === 'mock') return caseMockData.find((c) => c.id === id)

  try {
    const res = await http.get<Case>(`/v1/cases/${id}`)
    return res.data
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

export async function fetchCaseNotes(caseId: string): Promise<CaseNote[]> {
  const mode = getDataMode()
  if (mode === 'mock') return caseNoteMockData.filter((n) => n.caseId === caseId)

  try {
    const res = await http.get<CaseNote[]>(`/v1/cases/${caseId}/notes`)
    return res.data
  } catch {
    if (mode === 'auto') return caseNoteMockData.filter((n) => n.caseId === caseId)
    throw new Error('Failed to fetch case notes')
  }
}

export async function createCaseNote(data: Omit<CaseNote, 'id' | 'createdAt'>): Promise<CaseNote> {
  const mode = getDataMode()
  if (mode === 'mock') {
    const note: CaseNote = { ...data, id: `note-${Date.now()}`, createdAt: new Date().toISOString() }
    caseNoteMockData.push(note)
    return note
  }

  try {
    const res = await http.post<CaseNote>(`/v1/cases/${data.caseId}/notes`, data)
    return res.data
  } catch {
    if (mode === 'auto') {
      const note: CaseNote = { ...data, id: `note-${Date.now()}`, createdAt: new Date().toISOString() }
      caseNoteMockData.push(note)
      return note
    }
    throw new Error('Failed to create case note')
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
