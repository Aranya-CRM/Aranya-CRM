import { encodeHttpHeaderValue, http } from '../../../shared/api'
import { requireFirebaseIdToken } from '../../auth/api/auth'
import { queryClient } from '../../../app/queryClient'
import { auditHistoryQueryKeys } from '../../audit-history/api'
import type { CreateReportPayload, ReportDetail, ReportSummary, UpdateReportPayload } from '../types'

async function authHeaders() {
  return {
    Authorization: `Bearer ${await requireFirebaseIdToken()}`,
  }
}

interface ApprovalOptions {
  approverId?: number
  reason?: string
}

async function approvalHeaders(options?: ApprovalOptions) {
  const headers: Record<string, string> = await authHeaders()
  if (options?.approverId) headers['X-Approver-Id'] = String(options.approverId)
  if (options?.reason?.trim()) headers['X-Approval-Reason'] = encodeHttpHeaderValue(options.reason.trim())
  return headers
}

export async function fetchReports(options?: { mine?: boolean, caseId?: string | number, appointmentId?: string | number }): Promise<ReportSummary[]> {
  const res = await http.get<ReportSummary[]>('/v1/reports', {
    params: {
      ...(options?.mine ? { mine: true } : {}),
      ...(options?.caseId ? { caseId: options.caseId } : {}),
      ...(options?.appointmentId ? { appointmentId: options.appointmentId } : {}),
    },
  })
  return res.data
}

export async function fetchReportById(id: string | number): Promise<ReportDetail> {
  const res = await http.get<ReportDetail>(`/v1/reports/${id}`)
  return res.data
}

export async function createReport(data: CreateReportPayload): Promise<ReportDetail> {
  const res = await http.post<ReportDetail>('/v1/reports', data, {
    headers: await authHeaders(),
  })
  await queryClient.invalidateQueries({ queryKey: auditHistoryQueryKeys.all })
  return res.data
}

export async function updateReport(id: string | number, data: UpdateReportPayload): Promise<ReportDetail> {
  const res = await http.put<ReportDetail>(`/v1/reports/${id}`, data, {
    headers: await authHeaders(),
  })
  await queryClient.invalidateQueries({ queryKey: auditHistoryQueryKeys.all })
  return res.data
}

export async function submitReport(id: string | number): Promise<ReportDetail> {
  const res = await http.post<ReportDetail>(`/v1/reports/${id}/submit`, undefined, {
    headers: await authHeaders(),
  })
  await queryClient.invalidateQueries({ queryKey: auditHistoryQueryKeys.all })
  return res.data
}

export async function deleteReport(id: string | number, options?: ApprovalOptions): Promise<void> {
  await http.delete(`/v1/reports/${id}`, {
    headers: await approvalHeaders(options),
  })
  await queryClient.invalidateQueries({ queryKey: auditHistoryQueryKeys.all })
}
