import type { ApprovalRequest } from './api/approval.api'

export interface ApprovalNavBadgeCounts {
  clients: number
  cases: number
}

const CLIENT_APPROVAL_TYPES = new Set(['CLIENT_CREATE', 'CLIENT_UPDATE', 'DELETE_CLIENT'])
const CASE_APPROVAL_TYPES = new Set(['CASE_CREATE', 'CASE_SERVICE_UPDATE', 'DELETE_CASE'])

export function countApprovalNavBadges(
  approvals: Array<Pick<ApprovalRequest, 'type' | 'status' | 'requestedById' | 'assignedApproverId' | 'payloadJson'>>,
  currentUserId?: number,
): ApprovalNavBadgeCounts {
  const counts: ApprovalNavBadgeCounts = { clients: 0, cases: 0 }
  if (currentUserId === undefined) return counts

  approvals.forEach((approval) => {
    if (approval.status !== 'PENDING') return
    if (approval.requestedById === currentUserId && !isSelfAssignedDecision(approval, currentUserId)) return
    if (approval.assignedApproverId != null && approval.assignedApproverId !== currentUserId) return

    if (CLIENT_APPROVAL_TYPES.has(approval.type)) counts.clients += 1
    if (CASE_APPROVAL_TYPES.has(approval.type)) counts.cases += 1
  })

  return counts
}

function isSelfAssignedDecision(
  approval: Pick<ApprovalRequest, 'type' | 'requestedById' | 'assignedApproverId' | 'payloadJson'>,
  currentUserId: number,
): boolean {
  if (approval.requestedById !== currentUserId || approval.assignedApproverId !== currentUserId) {
    return false
  }
  if (approval.type === 'CLIENT_CREATE' || approval.type === 'CASE_CREATE') {
    return true
  }
  if (approval.type !== 'CASE_SERVICE_UPDATE') {
    return false
  }
  try {
    const parsed = JSON.parse(approval.payloadJson ?? '{}') as {
      addServiceKeys?: unknown
      removeServiceKeys?: unknown
    }
    return Array.isArray(parsed.addServiceKeys) &&
      parsed.addServiceKeys.length > 0 &&
      (!Array.isArray(parsed.removeServiceKeys) || parsed.removeServiceKeys.length === 0)
  } catch {
    return false
  }
}
