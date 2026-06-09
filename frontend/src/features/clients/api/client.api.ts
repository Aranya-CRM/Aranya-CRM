import { http } from '../../../shared/api'
import { clientMockData } from '../../../mocks/client.mock'
import type { Client } from '../types'

type BackendClientSummary = {
  id: number | string
  abbr?: string | null
  nameEn?: string | null
  nameChn?: string | null
  contact?: string | null
  preferredCommunication?: string | null
  preferredLanguage?: string | null
  area?: string | null
  areaDistrict?: string | null
  buddhistTradition?: string | null
  ordinationStatus?: string | null
}

type BackendClientDetail = BackendClientSummary & {
  whatsappEnabled?: boolean | null
  spokenLanguage?: string | null
  addressText?: string | null
  postalCode?: string | null
  viharaType?: string | null
  nricNameEn?: string | null
  nricNameChn?: string | null
  nricNo?: string | null
  ordinationCertificateStatus?: string | null
  dateOfVerification?: string | null
  gender?: string | null
  dateOfBirth?: string | null
  maritalStatus?: string | null
  nationality?: string | null
  ethnicity?: string | null
  dialectGroup?: string | null
  dateJoined?: string | null
  membershipRemarks?: string | null
  wellbeingLivingConditions?: boolean | null
  dateOfTonsure?: string | null
  countryOfTonsure?: string | null
  placeOfTonsure?: string | null
  dateOfOrdination?: string | null
  countryOfOrdination?: string | null
  placeOfOrdination?: string | null
  wellbeingMentalHealth?: boolean | null
  wellbeingPhysicalHealth?: boolean | null
  wellbeingFinancialStability?: boolean | null
  wellbeingSocialSupport?: boolean | null
  wellbeingLegalIssues?: boolean | null
  wellbeingSpiritual?: boolean | null
  wellbeingRemarks?: string | null
  specialNeeds?: string | null
  specialNeedsRemarks?: string | null
  bankTransferInfo?: string | null
  payNowInfo?: string | null
  nextOfKinContact?: string | null
  comments?: string | null
}

const emptyWellbeing = {
  physicalHealth: false,
  mentalHealth: false,
  socialSupport: false,
  financialStability: false,
  livingConditions: false,
  spiritual: false,
  legalIssues: false,
}

const emptySpecialNeeds = {
  physical: false,
  hearing: false,
  visual: false,
  intellectual: false,
}

function getDataMode(): 'mock' | 'api' | 'auto' {
  const mode = (import.meta.env.VITE_DATA_MODE ?? 'auto').toLowerCase()
  if (mode === 'mock' || mode === 'api') return mode
  return 'auto'
}

export async function fetchClients(): Promise<Client[]> {
  const mode = getDataMode()
  if (mode === 'mock') return clientMockData

  try {
    const res = await http.get<BackendClientSummary[]>('/v1/clients')
    return res.data.map(mapBackendClient)
  } catch {
    if (mode === 'auto') return clientMockData
    throw new Error('Failed to fetch clients')
  }
}

export async function fetchClientsWithoutCase(): Promise<Client[]> {
  const res = await http.get<BackendClientSummary[]>('/v1/clients/without-case')
  return res.data.map(mapBackendClient)
}

export async function fetchClientById(id: string): Promise<Client | undefined> {
  const mode = getDataMode()
  if (mode === 'mock') return clientMockData.find((c) => c.id === id)

  try {
    const res = await http.get<BackendClientDetail>(`/v1/clients/${id}`)
    return mapBackendClient(res.data)
  } catch {
    if (mode === 'auto') return clientMockData.find((c) => c.id === id)
    throw new Error('Failed to fetch client')
  }
}

export async function createClient(data: Omit<Client, 'id'>): Promise<Client> {
  const mode = getDataMode()
  if (mode === 'mock') {
    const newClient = { ...data, id: `client-${Date.now()}` } as Client
    clientMockData.push(newClient)
    return newClient
  }

  try {
    const res = await http.post<BackendClientDetail>('/v1/clients', data)
    return mapBackendClient(res.data)
  } catch {
    if (mode === 'auto') {
      const newClient = { ...data, id: `client-${Date.now()}` } as Client
      clientMockData.push(newClient)
      return newClient
    }
    throw new Error('Failed to create client')
  }
}

export async function updateClient(id: string, data: Partial<Client>): Promise<Client> {
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
    const res = await http.patch<BackendClientDetail>(`/v1/clients/${id}`, payload)
    return mapBackendClient(res.data)
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

export async function deleteClient(id: string): Promise<void> {
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
    await http.delete(`/v1/clients/${id}`)
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

function mapBackendClient(source: BackendClientDetail): Client {
  const dateOfBirth = text(source.dateOfBirth)
  const dateOfOrdination = text(source.dateOfOrdination)

  return {
    id: String(source.id),
    abbr: text(source.abbr),
    nameEn: text(source.nameEn),
    nameChn: text(source.nameChn),
    nricNameEn: text(source.nricNameEn),
    nricNameChn: text(source.nricNameChn),
    nricNo: text(source.nricNo),
    gender: mapGender(source.gender),
    dateOfBirth,
    age: calculateYearsSince(dateOfBirth),
    maritalStatus: mapMaritalStatus(source.maritalStatus),
    nationality: text(source.nationality),
    ethnicity: text(source.ethnicity),
    dialectGroup: text(source.dialectGroup),
    contact: text(source.contact),
    nextOfKinContact: text(source.nextOfKinContact),
    preferredCommunication: mapPreferredCommunication(source.preferredCommunication),
    whatsappEnabled: Boolean(source.whatsappEnabled),
    preferredLanguage: text(source.preferredLanguage),
    spokenLanguage: text(source.spokenLanguage),
    addressText: text(source.addressText),
    postalCode: text(source.postalCode),
    viharaType: text(source.viharaType),
    areaDistrict: text(source.areaDistrict ?? source.area),
    dateJoined: text(source.dateJoined),
    membershipRemarks: text(source.membershipRemarks),
    buddhistTradition: mapBuddhistTradition(source.buddhistTradition),
    ordinationStatus: text(source.ordinationStatus),
    dateOfTonsure: text(source.dateOfTonsure),
    countryOfTonsure: text(source.countryOfTonsure),
    placeOfTonsure: text(source.placeOfTonsure),
    dateOfOrdination,
    countryOfOrdination: text(source.countryOfOrdination),
    placeOfOrdination: text(source.placeOfOrdination),
    ordinationYears: calculateYearsSince(dateOfOrdination),
    ordinationCertificate: mapOrdinationCertificate(source.ordinationCertificateStatus),
    dateOfVerification: text(source.dateOfVerification),
    wellbeingIssues: {
      ...emptyWellbeing,
      physicalHealth: Boolean(source.wellbeingPhysicalHealth),
      mentalHealth: Boolean(source.wellbeingMentalHealth),
      socialSupport: Boolean(source.wellbeingSocialSupport),
      financialStability: Boolean(source.wellbeingFinancialStability),
      livingConditions: Boolean(source.wellbeingLivingConditions),
      spiritual: Boolean(source.wellbeingSpiritual),
      legalIssues: Boolean(source.wellbeingLegalIssues),
    },
    wellbeingRemarks: text(source.wellbeingRemarks),
    specialNeeds: mapSpecialNeeds(source.specialNeeds),
    specialNeedsRemarks: text(source.specialNeedsRemarks),
    bankTransferInfo: text(source.bankTransferInfo),
    payNowInfo: text(source.payNowInfo),
    comments: text(source.comments),
  }
}

function text(value: string | number | null | undefined): string {
  return value === null || value === undefined ? '' : String(value)
}

function normalizeEnum(value: string | null | undefined): string {
  return text(value).trim().replaceAll('_', ' ').toLowerCase()
}

function mapPreferredCommunication(value: string | null | undefined): Client['preferredCommunication'] {
  const normalized = normalizeEnum(value)
  if (normalized.includes('audio')) return 'WhatsApp Audio'
  if (normalized.includes('whatsapp')) return 'WhatsApp Msg'
  if (normalized.includes('home')) return 'Home Visit'
  return 'Phone Call'
}

function mapGender(value: string | null | undefined): Client['gender'] {
  const normalized = normalizeEnum(value)
  return normalized.startsWith('f') ? 'Female' : 'Male'
}

function mapMaritalStatus(value: string | null | undefined): Client['maritalStatus'] {
  const normalized = normalizeEnum(value)
  if (normalized === 'married') return 'Married'
  if (normalized === 'divorced') return 'Divorced'
  if (normalized === 'separated') return 'Separated'
  if (normalized === 'widowed') return 'Widowed'
  return 'Never married'
}

function mapBuddhistTradition(value: string | null | undefined): Client['buddhistTradition'] {
  const normalized = normalizeEnum(value)
  if (normalized === 'theravada') return 'Theravada'
  if (normalized === 'vajrayana') return 'Vajrayana'
  return 'Mahayana'
}

function mapOrdinationCertificate(value: string | null | undefined): Client['ordinationCertificate'] {
  const normalized = normalizeEnum(value)
  if (normalized === 'completed' || normalized === 'complete') return 'Completed'
  return 'Incomplete'
}

function mapSpecialNeeds(value: string | null | undefined): Client['specialNeeds'] {
  const normalized = normalizeEnum(value)
  return {
    ...emptySpecialNeeds,
    physical: normalized.includes('physical'),
    hearing: normalized.includes('hearing'),
    visual: normalized.includes('visual'),
    intellectual: normalized.includes('intellectual'),
  }
}

function calculateYearsSince(date: string): number {
  if (!date) return 0
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return 0

  const now = new Date()
  let years = now.getFullYear() - parsed.getFullYear()
  const hasNotReachedAnniversary =
    now.getMonth() < parsed.getMonth() ||
    (now.getMonth() === parsed.getMonth() && now.getDate() < parsed.getDate())
  if (hasNotReachedAnniversary) years -= 1
  return Math.max(years, 0)
}
