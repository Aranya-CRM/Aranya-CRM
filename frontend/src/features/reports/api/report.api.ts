import { http } from '../../../shared/api'
import { requireFirebaseIdToken } from '../../auth/api/auth'
import type { CreateReportPayload, ReportDetail, ReportSummary, UpdateReportPayload } from '../types'

async function authHeaders() {
  return {
    Authorization: `Bearer ${await requireFirebaseIdToken()}`,
  }
}

export async function fetchReports(options?: { mine?: boolean, caseId?: string | number }): Promise<ReportSummary[]> {
  const res = await http.get<ReportSummary[]>('/v1/reports', {
    params: {
      ...(options?.mine ? { mine: true } : {}),
      ...(options?.caseId ? { caseId: options.caseId } : {}),
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
  return res.data
}

export async function updateReport(id: string | number, data: UpdateReportPayload): Promise<ReportDetail> {
  const res = await http.put<ReportDetail>(`/v1/reports/${id}`, data, {
    headers: await authHeaders(),
  })
  return res.data
}

export async function submitReport(id: string | number): Promise<ReportDetail> {
  const res = await http.post<ReportDetail>(`/v1/reports/${id}/submit`, undefined, {
    headers: await authHeaders(),
  })
  return res.data
}

export async function deleteReport(id: string | number): Promise<void> {
  await http.delete(`/v1/reports/${id}`, {
    headers: await authHeaders(),
  })
}

export async function approveReport(id: string | number): Promise<ReportDetail> {
  const res = await http.post<ReportDetail>(`/v1/reports/${id}/approve`, undefined, {
    headers: await authHeaders(),
  })
  return res.data
}
