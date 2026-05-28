export type ReportStatus = 'DRAFT' | 'SUBMITTED' | 'ARCHIVED' | 'RETURNED'

export interface ReportSummary {
  id: number
  clientId?: number | null
  clientNameEn?: string | null
  clientNameChn?: string | null
  createdById?: number | null
  createdByName?: string | null
  staffName?: string | null
  reportTimestamp?: string | null
  dateOfVisit?: string | null
  timeOfVisit?: string | null
  durationOfVisit?: string | null
  location?: string | null
  programmeName?: string | null
  typeOfVisit?: string | null
  status?: ReportStatus | null
  createdAt?: string | null
}

export interface ReportDetail extends ReportSummary {
  purposeOfVisit?: string | null
  whatWasDone?: string | null
  environmentObservations?: string | null
  sanghaObservations?: string | null
  otherObservations?: string | null
  personalReflections?: string | null
  recommendations?: string | null
  mattersToHighlight?: string | null
  updatedAt?: string | null
}

export type CreateReportPayload = {
  clientId: number
  dateOfVisit: string
  timeOfVisit?: string
  durationOfVisit?: string
  staffName?: string
  location?: string
  programmeName?: string
  typeOfVisit?: string
  purposeOfVisit?: string
  whatWasDone?: string
  environmentObservations?: string
  sanghaObservations?: string
  otherObservations?: string
  personalReflections?: string
  recommendations?: string
  mattersToHighlight?: string
  status?: ReportStatus
}

export type UpdateReportPayload = CreateReportPayload
