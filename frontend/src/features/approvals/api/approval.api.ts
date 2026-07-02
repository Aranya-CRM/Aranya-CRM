import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { http } from '../../../shared/api'
import { caseQueryKeys } from '../../cases/hooks'
import { clientQueryKeys } from '../../clients/hooks'

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED'

export interface ApprovalRequest {
  id: number
  type: string
  status: ApprovalStatus
  targetType?: string | null
  targetId?: number | null
  targetLabel?: string | null
  payloadJson?: string | null
  requestedById?: number | null
  requestedByName?: string | null
  assignedApproverId?: number | null
  assignedApproverName?: string | null
  decidedById?: number | null
  decidedByName?: string | null
  decisionComment?: string | null
  createdAt?: string | null
  decidedAt?: string | null
}

export interface DecideApprovalPayload {
  comment?: string
}

export const approvalQueryKeys = {
  all: ['approvals'] as const,
  pending: () => [...approvalQueryKeys.all, 'pending'] as const,
}

export const PENDING_APPROVALS_REFETCH_INTERVAL_MS = 3000

export async function fetchPendingApprovals(): Promise<ApprovalRequest[]> {
  const res = await http.get<ApprovalRequest[]>('/v1/approvals')
  return res.data
}

export async function approveRequest(id: number, data: DecideApprovalPayload): Promise<ApprovalRequest> {
  const res = await http.post<ApprovalRequest>(`/v1/approvals/${id}/approve`, data)
  return res.data
}

export async function rejectRequest(id: number, data: DecideApprovalPayload): Promise<ApprovalRequest> {
  const res = await http.post<ApprovalRequest>(`/v1/approvals/${id}/reject`, data)
  return res.data
}

export function usePendingApprovals(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: approvalQueryKeys.pending(),
    queryFn: fetchPendingApprovals,
    enabled: options?.enabled ?? true,
    refetchInterval: PENDING_APPROVALS_REFETCH_INTERVAL_MS,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  })
}

export function useApproveRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: DecideApprovalPayload }) => approveRequest(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: approvalQueryKeys.pending() })
      queryClient.invalidateQueries({ queryKey: caseQueryKeys.all })
      queryClient.invalidateQueries({ queryKey: clientQueryKeys.all })
    },
  })
}

export function useRejectRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: DecideApprovalPayload }) => rejectRequest(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: approvalQueryKeys.pending() })
      queryClient.invalidateQueries({ queryKey: caseQueryKeys.all })
      queryClient.invalidateQueries({ queryKey: clientQueryKeys.all })
    },
  })
}
