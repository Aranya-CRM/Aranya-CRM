export interface CaseApprovalLike {
  id: number
  type: string
  targetId?: number | string | null
  createdAt?: string | null
}

export function isCaseApprovalType(type: string): boolean {
  return type === 'CASE_CREATE' || type === 'DELETE_CASE'
}

export function mergePendingCaseApprovals<T extends CaseApprovalLike>(
  serverApprovals: T[],
  localApprovals: T[],
  serverUpdatedAt: number,
): T[] {
  const serverItems = serverApprovals.filter((approval) => isCaseApprovalType(approval.type))
  const serverIds = new Set(serverItems.map((approval) => approval.id))
  const localItems = localApprovals.filter((approval) => (
    isCaseApprovalType(approval.type) &&
    !serverIds.has(approval.id) &&
    !isKnownStaleLocalApproval(approval, serverUpdatedAt)
  ))
  return [...serverItems, ...localItems]
}

export function staleLocalCaseApprovalIds<T extends CaseApprovalLike>(
  serverApprovals: T[],
  localApprovals: T[],
  serverUpdatedAt: number,
): number[] {
  const serverIds = new Set(
    serverApprovals
      .filter((approval) => isCaseApprovalType(approval.type))
      .map((approval) => approval.id),
  )
  return localApprovals
    .filter((approval) => (
      isCaseApprovalType(approval.type) &&
      !serverIds.has(approval.id) &&
      isKnownStaleLocalApproval(approval, serverUpdatedAt)
    ))
    .map((approval) => approval.id)
}

function isKnownStaleLocalApproval(approval: CaseApprovalLike, serverUpdatedAt: number): boolean {
  if (serverUpdatedAt <= 0) return false
  const createdAt = approval.createdAt ? Date.parse(approval.createdAt) : 0
  return createdAt > 0 && createdAt <= serverUpdatedAt
}
