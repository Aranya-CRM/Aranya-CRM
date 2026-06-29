import { encodeHttpHeaderValue, http } from '../../../shared/api'
import { clientMockData } from '../../../mocks/client.mock'
import type { Client } from '../types'
import { mapBackendClientResponse, type BackendClientResponse } from '../pages/clientProfileUtils'

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

export type ClientWriteResult = Client | ApprovalRequest
export interface ApprovalOptions {
  approverId?: number
  reason?: string
}

function getDataMode(): 'mock' | 'api' | 'auto' {
  const mode = (import.meta.env.VITE_DATA_MODE ?? 'api').toLowerCase()
  if (mode === 'mock' || mode === 'api') return mode
  return 'auto'
}

export async function fetchClients(): Promise<Client[]> {
  const mode = getDataMode()
  if (mode === 'mock') return clientMockData

  try {
    const res = await http.get<BackendClientResponse[]>('/v1/clients')
    return res.data.map((client) => mapBackendClientResponse(client))
  } catch {
    if (mode === 'auto') return clientMockData
    throw new Error('Failed to fetch clients')
  }
}

export async function fetchClientsAvailableForCase(): Promise<Client[]> {
  const res = await http.get<BackendClientResponse[]>('/v1/clients/without-case')
  return res.data.map((client) => mapBackendClientResponse(client))
}

export async function fetchClientById(id: string): Promise<Client | undefined> {
  const mode = getDataMode()
  if (mode === 'mock') return clientMockData.find((c) => c.id === id)

  try {
    const res = await http.get<BackendClientResponse>(`/v1/clients/${id}`)
    return mapBackendClientResponse(res.data)
  } catch {
    if (mode === 'auto') return clientMockData.find((c) => c.id === id)
    throw new Error('Failed to fetch client')
  }
}

function approvalRequestConfig(options?: ApprovalOptions) {
  const headers: Record<string, string> = {}
  if (options?.approverId) headers['X-Approver-Id'] = String(options.approverId)
  if (options?.reason?.trim()) headers['X-Approval-Reason'] = encodeHttpHeaderValue(options.reason.trim())
  return Object.keys(headers).length > 0 ? { headers } : undefined
}

export async function createClient(data: Omit<Client, 'id'>, options?: ApprovalOptions): Promise<ClientWriteResult> {
  const mode = getDataMode()
  if (mode === 'mock') {
    const newClient = { ...data, id: `client-${Date.now()}` } as Client
    clientMockData.push(newClient)
    return newClient
  }

  try {
    const res = await http.post<ApprovalRequest>('/v1/clients', data, approvalRequestConfig(options))
    return res.data
  } catch {
    if (mode === 'auto') {
      const newClient = { ...data, id: `client-${Date.now()}` } as Client
      clientMockData.push(newClient)
      return newClient
    }
    throw new Error('Failed to create client')
  }
}

export async function updateClient(id: string, data: Partial<Client>, options?: ApprovalOptions): Promise<ClientWriteResult> {
  const mode = getDataMode()
  const payload = toBackendClientPayload(data)
  if (mode === 'mock') {
    const idx = clientMockData.findIndex((c) => c.id === id)
    if (idx === -1) throw new Error('Client not found')
    const updated = { ...clientMockData[idx], ...data }
    clientMockData[idx] = updated
    return updated
  }

  try {
    const res = await http.patch<BackendClientResponse>(`/v1/clients/${id}`, payload, approvalRequestConfig(options))
    return mapBackendClientResponse(res.data)
  } catch {
    if (mode === 'auto') {
      const idx = clientMockData.findIndex((c) => c.id === id)
      if (idx === -1) throw new Error('Client not found')
      const updated = { ...clientMockData[idx], ...data }
      clientMockData[idx] = updated
      return updated
    }
    throw new Error('Failed to update client')
  }
}

export async function deleteClient(id: string, options?: ApprovalOptions): Promise<ApprovalRequest | void> {
  const mode = getDataMode()
  const removeMockClient = () => {
    const idx = clientMockData.findIndex((c) => c.id === id)
    if (idx >= 0) clientMockData.splice(idx, 1)
  }

  if (mode === 'mock') {
    removeMockClient()
    return
  }

  try {
    const res = await http.delete<ApprovalRequest>(`/v1/clients/${id}`, approvalRequestConfig(options))
    return res.data
  } catch {
    if (mode === 'auto') {
      removeMockClient()
      return
    }
    throw new Error('Failed to delete client')
  }
}

function toBackendClientPayload(data: Partial<Client>) {
  return {
    nameEn: data.nameEn,
    nameChn: data.nameChn,
    abbr: data.abbr,
    contact: data.contact,
    preferredCommunication: data.preferredCommunication,
    whatsappEnabled: data.whatsappEnabled,
    preferredLanguage: data.preferredLanguage,
    spokenLanguage: data.spokenLanguage,
    addressText: data.addressText,
    postalCode: data.postalCode,
    areaDistrict: data.areaDistrict,
    viharaType: data.viharaType,
    nricNameEn: data.nricNameEn,
    nricNameChn: data.nricNameChn,
    nricNo: data.nricNo,
    ordinationCertificateStatus: data.ordinationCertificate,
    dateOfVerification: data.dateOfVerification || undefined,
    gender: data.gender,
    dateOfBirth: data.dateOfBirth || undefined,
    maritalStatus: data.maritalStatus,
    nationality: data.nationality,
    ethnicity: data.ethnicity,
    dialectGroup: data.dialectGroup,
    dateJoined: data.dateJoined || undefined,
    membershipRemarks: data.membershipRemarks,
    buddhistTradition: data.buddhistTradition,
    ordinationStatus: data.ordinationStatus,
    dateOfTonsure: data.dateOfTonsure || undefined,
    countryOfTonsure: data.countryOfTonsure,
    placeOfTonsure: data.placeOfTonsure,
    dateOfOrdination: data.dateOfOrdination || undefined,
    countryOfOrdination: data.countryOfOrdination,
    placeOfOrdination: data.placeOfOrdination,
    wellbeingPhysicalHealth: data.wellbeingIssues?.physicalHealth,
    wellbeingMentalHealth: data.wellbeingIssues?.mentalHealth,
    wellbeingSocialSupport: data.wellbeingIssues?.socialSupport,
    wellbeingFinancialStability: data.wellbeingIssues?.financialStability,
    wellbeingLivingConditions: data.wellbeingIssues?.livingConditions,
    wellbeingSpiritual: data.wellbeingIssues?.spiritual,
    wellbeingLegalIssues: data.wellbeingIssues?.legalIssues,
    wellbeingRemarks: data.wellbeingRemarks,
    specialNeeds: data.specialNeeds ? Object.entries(data.specialNeeds).filter(([, value]) => value).map(([key]) => key).join(',') : undefined,
    specialNeedsRemarks: data.specialNeedsRemarks,
    bankTransferInfo: data.bankTransferInfo,
    payNowInfo: data.payNowInfo,
    nextOfKinContact: data.nextOfKinContact,
    comments: data.comments,
  }
}

