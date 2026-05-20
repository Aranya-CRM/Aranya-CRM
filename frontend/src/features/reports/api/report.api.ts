import { http } from '../../../shared/api'
import type { CreateReportPayload, ReportDetail, ReportSummary } from '../types'

export async function fetchReports(): Promise<ReportSummary[]> {
  const res = await http.get<ReportSummary[]>('/v1/reports')
  return res.data
}

export async function fetchReportById(id: string | number): Promise<ReportDetail> {
  const res = await http.get<ReportDetail>(`/v1/reports/${id}`)
  return res.data
}

export async function createReport(data: CreateReportPayload): Promise<ReportDetail> {
  const res = await http.post<ReportDetail>('/v1/reports', data)
  return res.data
}

export async function deleteReport(id: string | number): Promise<void> {
  await http.delete(`/v1/reports/${id}`)
}
