import { http } from '../../../shared/api'
import { reportMockData } from '../../../mocks/report.mock'
import type { EngagementReport } from '../types'

function getDataMode(): 'mock' | 'api' | 'auto' {
  const mode = (import.meta.env.VITE_DATA_MODE ?? 'auto').toLowerCase()
  if (mode === 'mock' || mode === 'api') return mode
  return 'auto'
}

export async function fetchReports(submittedById?: string): Promise<EngagementReport[]> {
  const mode = getDataMode()
  if (mode === 'mock') {
    if (submittedById) return reportMockData.filter((r) => r.submittedById === submittedById)
    return reportMockData
  }

  try {
    const params = submittedById ? { submittedById } : undefined
    const res = await http.get<EngagementReport[]>('/v1/reports', { params })
    return res.data
  } catch {
    if (mode === 'auto') {
      if (submittedById) return reportMockData.filter((r) => r.submittedById === submittedById)
      return reportMockData
    }
    throw new Error('Failed to fetch reports')
  }
}

export async function createReport(data: Omit<EngagementReport, 'id' | 'timestamp'>): Promise<EngagementReport> {
  const mode = getDataMode()
  if (mode === 'mock') {
    const report: EngagementReport = { ...data, id: `report-${Date.now()}`, timestamp: new Date().toISOString() }
    reportMockData.push(report)
    return report
  }

  try {
    const res = await http.post<EngagementReport>('/v1/reports', data)
    return res.data
  } catch {
    if (mode === 'auto') {
      const report: EngagementReport = { ...data, id: `report-${Date.now()}`, timestamp: new Date().toISOString() }
      reportMockData.push(report)
      return report
    }
    throw new Error('Failed to create report')
  }
}
