import { useQuery } from '@tanstack/react-query'
import { http } from '../../shared/api'
import { useAuth } from '../../contexts/AuthContext'
import type { AuditTrailEntry } from './types'

export const auditHistoryQueryKeys = {
  all: ['audit-history'] as const,
  case: (caseId: string) => [...auditHistoryQueryKeys.all, 'case', caseId] as const,
  scopedCase: (caseId: string, userId: number) => [...auditHistoryQueryKeys.case(caseId), 'user', userId] as const,
}

export async function fetchCaseAuditHistory(caseId: string): Promise<AuditTrailEntry[]> {
  const res = await http.get<AuditTrailEntry[]>(`/v1/audit-history/cases/${caseId}`)
  return res.data ?? []
}

export function useCaseAuditHistory(caseId: string | undefined) {
  const { user } = useAuth()

  return useQuery({
    queryKey: caseId && user
      ? auditHistoryQueryKeys.scopedCase(caseId, user.id)
      : auditHistoryQueryKeys.all,
    queryFn: () => fetchCaseAuditHistory(caseId!),
    enabled: Boolean(caseId && user),
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })
}
