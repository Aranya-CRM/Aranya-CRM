import { http } from '../../../shared/api'
import type { DashboardResponse } from '../types'

export async function fetchDashboardData(): Promise<DashboardResponse> {
  const response = await http.get<DashboardResponse>('/v1/dashboard')
  return response.data
}

