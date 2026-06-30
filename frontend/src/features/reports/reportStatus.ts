import type { ReportStatus } from './types'

export function reportStatusKey(status: string | null | undefined): ReportStatus {
  return status === 'DRAFT' ? 'DRAFT' : 'SUBMITTED'
}

export function isCurrentReportStatus(status: string | null | undefined): boolean {
  return status === 'DRAFT' || status === 'SUBMITTED' || !status
}

export function isSubmittedReport(status: string | null | undefined): boolean {
  return status === 'SUBMITTED' || !status
}
