import { useQuery } from '@tanstack/react-query'
import { http } from '../../shared/api'
import type { AuditTrailEntry } from './types'

export const auditHistoryQueryKeys = {
  all: ['audit-history'] as const,
  case: (caseId: string) => [...auditHistoryQueryKeys.all, 'case', caseId] as const,
}

export async function fetchCaseAuditHistory(caseId: string): Promise<AuditTrailEntry[]> {
  const res = await http.get<AuditTrailEntry[]>(`/v1/audit-history/cases/${caseId}`)
  return res.data ?? []
}

export function useCaseAuditHistory(caseId: string | undefined) {
  return useQuery({
    queryKey: caseId ? auditHistoryQueryKeys.case(caseId) : auditHistoryQueryKeys.all,
    queryFn: () => fetchCaseAuditHistory(caseId!),
    enabled: Boolean(caseId),
  })
}
