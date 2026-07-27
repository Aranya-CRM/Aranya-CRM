import type { Client } from '../types'

export interface ClientDateFields {
  dateOfBirth: string
  dateOfOrdination: string
}

export type ClientCaseFilter = 'all' | 'with_case' | 'without_case'
export type ClientArchiveFilter = 'current' | 'closed'
export type ClientGenderFilter = 'all' | Client['gender']
export type ClientOrdinationStatusFilter = 'all' | Client['ordinationStatus']
export type ClientDirectorySort =
  | 'default'
  | 'created_at_asc'
  | 'created_at_desc'
  | 'alpha_asc'
  | 'alpha_desc'
  | 'ordination_years_asc'
  | 'ordination_years_desc'
  | 'age_asc'
  | 'age_desc'
export type ClientProfileAction = 'convertToCase' | 'closeCase' | 'editProfile' | 'closeProfile'

export type BackendClientResponse = {
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
  membershipStatus?: string | null
  createdAt?: string | null
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

export function calculateCompletedYears(date: string, referenceDate = new Date()): number {
  if (!date) return 0
  const parsed = new Date(`${date}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return 0

  let years = referenceDate.getFullYear() - parsed.getFullYear()
  const hasNotReachedAnniversary =
    referenceDate.getMonth() < parsed.getMonth() ||
    (referenceDate.getMonth() === parsed.getMonth() && referenceDate.getDate() < parsed.getDate())
  if (hasNotReachedAnniversary) years -= 1
  return Math.max(years, 0)
}

export function deriveClientDateFields(fields: ClientDateFields, referenceDate = new Date()) {
  return {
    age: calculateCompletedYears(fields.dateOfBirth, referenceDate),
    ordinationYears: calculateCompletedYears(fields.dateOfOrdination, referenceDate),
  }
}

export function applyClientCaseFilter<T extends { id: string }>(
  clients: T[],
  withCaseIds: Set<string>,
  filter: ClientCaseFilter,
): T[] {
  if (filter === 'all') return clients
  return clients.filter((client) => {
    const hasCase = withCaseIds.has(client.id)
    return filter === 'with_case' ? hasCase : !hasCase
  })
}

export function isClientClosed(client: { membershipStatus?: string | null }): boolean {
  const status = (client.membershipStatus ?? '').trim().toUpperCase()
  return status === 'CLOSED' || status === 'DELETED'
}

export function applyClientStatusFilter<T extends { membershipStatus?: string | null }>(
  clients: T[],
  filter: ClientArchiveFilter,
): T[] {
  return clients.filter((client) => filter === 'closed' ? isClientClosed(client) : !isClientClosed(client))
}

export function applyClientGenderFilter<T extends { gender?: string | null }>(
  clients: T[],
  filter: ClientGenderFilter,
): T[] {
  if (filter === 'all') return clients
  return clients.filter((client) => client.gender === filter)
}

export function applyClientOrdinationStatusFilter<T extends { ordinationStatus?: string | null }>(
  clients: T[],
  filter: readonly string[],
): T[] {
  if (filter.length === 0) return clients
  return clients.filter((client) => filter.includes(client.ordinationStatus ?? ''))
}

export function sortClientDirectory<T extends {
  age?: number | null
  ordinationYears?: number | null
  dateOfBirth?: string | null
  dateOfOrdination?: string | null
  createdAt?: string | null
  abbr?: string | null
  nameEn?: string | null
  nameChn?: string | null
}>(
  clients: T[],
  sort: ClientDirectorySort,
): T[] {
  if (sort === 'default') return clients

  if (sort.startsWith('created_at')) {
    const direction = sort.endsWith('desc') ? -1 : 1
    return clients
      .map((client, index) => ({ client, index }))
      .sort((a, b) => {
        const left = sortableTimestamp(a.client.createdAt)
        const right = sortableTimestamp(b.client.createdAt)
        if (left === undefined && right === undefined) return a.index - b.index
        if (left === undefined) return 1
        if (right === undefined) return -1
        if (left === right) return a.index - b.index
        return (left - right) * direction
      })
      .map((entry) => entry.client)
  }

  if (sort.startsWith('alpha')) {
    const direction = sort.endsWith('desc') ? -1 : 1
    return clients
      .map((client, index) => ({ client, index }))
      .sort((a, b) => {
        const left = sortableClientName(a.client)
        const right = sortableClientName(b.client)
        if (!left && !right) return a.index - b.index
        if (!left) return 1
        if (!right) return -1
        const compared = left.localeCompare(right, undefined, { sensitivity: 'base', numeric: true })
        if (compared === 0) return a.index - b.index
        return compared * direction
      })
      .map((entry) => entry.client)
  }

  const key = sort.startsWith('age') ? 'age' : 'ordinationYears'
  const dateKey = sort.startsWith('age') ? 'dateOfBirth' : 'dateOfOrdination'
  const direction = sort.endsWith('desc') ? -1 : 1

  return clients
    .map((client, index) => ({ client, index }))
    .sort((a, b) => {
      const left = sortableNumber(a.client[key], a.client[dateKey])
      const right = sortableNumber(b.client[key], b.client[dateKey])
      if (left === undefined && right === undefined) return a.index - b.index
      if (left === undefined) return 1
      if (right === undefined) return -1
      if (left === right) return a.index - b.index
      return (left - right) * direction
    })
    .map((entry) => entry.client)
}

export function countActiveClientFilters(
  traditionFilter: readonly string[],
  caseFilter: ClientCaseFilter,
  archiveFilter: ClientArchiveFilter,
  genderFilter: ClientGenderFilter = 'all',
  ordinationStatusFilter: readonly string[] = [],
  sort: ClientDirectorySort = 'default',
): number {
  return Number(traditionFilter.length > 0) +
    Number(caseFilter !== 'all') +
    Number(archiveFilter !== 'current') +
    Number(genderFilter !== 'all') +
    Number(ordinationStatusFilter.length > 0) +
    Number(sort !== 'default')
}

function sortableNumber(value: number | null | undefined, sourceDate?: string | null): number | undefined {
  if (!sourceDate) return undefined
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function sortableTimestamp(value: string | null | undefined): number | undefined {
  if (!value) return undefined
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : undefined
}

function sortableClientName(client: {
  abbr?: string | null
  nameEn?: string | null
  nameChn?: string | null
}): string {
  return String(client.abbr || client.nameEn || client.nameChn || '').trim()
}

export function profileActionGroups({
  canEdit,
  canConvertToCase,
  canCloseProfile,
  canCloseCase,
  closed,
}: {
  canEdit: boolean
  canConvertToCase: boolean
  canCloseProfile: boolean
  canCloseCase: boolean
  closed: boolean
}): { primary: ClientProfileAction[]; secondary: ClientProfileAction[] } {
  if (closed) return { primary: [], secondary: [] }
  return {
    primary: canEdit ? ['editProfile'] : [],
    secondary: [
      ...(canConvertToCase ? ['convertToCase' as const] : []),
      ...(canCloseCase ? ['closeCase' as const] : []),
      ...(canCloseProfile ? ['closeProfile' as const] : []),
    ],
  }
}

export function mapBackendClientResponse(source: BackendClientResponse, referenceDate = new Date()): Client {
  const dateOfBirth = text(source.dateOfBirth)
  const dateOfOrdination = text(source.dateOfOrdination)

  return {
    id: String(source.id),
    createdAt: text(source.createdAt),
    membershipStatus: text(source.membershipStatus || 'ACTIVE').toUpperCase() as Client['membershipStatus'],
    abbr: text(source.abbr),
    nameEn: text(source.nameEn),
    nameChn: text(source.nameChn),
    nricNameEn: text(source.nricNameEn),
    nricNameChn: text(source.nricNameChn),
    nricNo: text(source.nricNo),
    gender: mapGender(source.gender),
    dateOfBirth,
    age: calculateCompletedYears(dateOfBirth, referenceDate),
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
    ordinationYears: calculateCompletedYears(dateOfOrdination, referenceDate),
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
