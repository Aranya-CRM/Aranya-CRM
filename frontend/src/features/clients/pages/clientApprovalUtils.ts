export interface ClientApprovalLike {
  id: number
  type: string
  targetId?: number | string | null
  createdAt?: string | null
}

export function isClientApprovalType(type: string): boolean {
  return type === 'CLIENT_CREATE' || type === 'CLIENT_UPDATE' || type === 'DELETE_CLIENT'
}

export function mergePendingApprovals<T extends ClientApprovalLike>(
  serverApprovals: T[],
  localApprovals: T[],
  serverUpdatedAt: number,
): T[] {
  const serverItems = serverApprovals.filter((approval) => isClientApprovalType(approval.type))
  const serverIds = new Set(serverItems.map((approval) => approval.id))
  const localItems = localApprovals.filter((approval) => (
    isClientApprovalType(approval.type) &&
    !serverIds.has(approval.id) &&
    !isKnownStaleLocalApproval(approval, serverUpdatedAt)
  ))
  return [...serverItems, ...localItems]
}

export function staleLocalApprovalIds<T extends ClientApprovalLike>(
  serverApprovals: T[],
  localApprovals: T[],
  serverUpdatedAt: number,
): number[] {
  const serverIds = new Set(
    serverApprovals
      .filter((approval) => isClientApprovalType(approval.type))
      .map((approval) => approval.id),
  )
  return localApprovals
    .filter((approval) => (
      isClientApprovalType(approval.type) &&
      !serverIds.has(approval.id) &&
      isKnownStaleLocalApproval(approval, serverUpdatedAt)
    ))
    .map((approval) => approval.id)
}

function isKnownStaleLocalApproval(approval: ClientApprovalLike, serverUpdatedAt: number): boolean {
  if (serverUpdatedAt <= 0) return false
  const createdAt = approval.createdAt ? Date.parse(approval.createdAt) : 0
  return createdAt > 0 && createdAt <= serverUpdatedAt
}
