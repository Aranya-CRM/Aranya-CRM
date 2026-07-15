export type AuditAction =
  | 'CASE_CREATE'
  | 'DELETE_CASE'
  | 'RESTORE_CASE'
  | 'DELETE_CLIENT'
  | 'RESTORE_CLIENT'
  | 'DELETE_REPORT'
  | 'CASE_SERVICE_UPDATE'
  | 'CLIENT_CREATE'
  | 'CLIENT_UPDATE'
  | 'SENSITIVE_FILE_ARCHIVE'
  | 'SENSITIVE_FILE_RESTORE'
  | 'SENSITIVE_FILE_SUPERSEDE'
  | 'SENSITIVE_FILE_VERSION_CREATE'
  | 'CASE_NOTE_CREATE'
  | 'SERVICE_EVENT_CREATE'

export type AuditTargetType = 'CASE' | 'CLIENT' | 'SENSITIVE_FILE' | 'SERVICE' | 'CASE_NOTE' | 'SERVICE_EVENT'

export type AuditLifecycleStatus = 'active' | 'archived' | 'superseded' | 'restored'

export type AuditDecisionStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'not_required'

export type AuditCategory = 'all' | 'member' | 'service' | 'case' | 'file' | 'report'

export interface AuditTrailEntry {
  id: string
  action: AuditAction
  targetType: AuditTargetType
  targetId: string | number
  caseId?: string | number
  targetLabel: string
  actorName: string
  occurredAt: string
  approvalRequired: boolean
  lifecycleStatus: AuditLifecycleStatus
  decisionStatus: AuditDecisionStatus
  summary: string
  reason?: string
  requestedByName?: string
  requestedAt?: string
  decidedByName?: string
  decidedAt?: string
  approvalRequestId?: string
  version?: number
  previousVersionId?: string
  metadata?: Record<string, string>
  canEdit?: boolean
  canDelete?: boolean
}

export interface AuditScope {
  targetType: AuditTargetType
  targetId: string | number
}

export interface AuditTrailSummary {
  totalEvents: number
  pendingApprovals: number
  approvedApprovals: number
  rejectedApprovals: number
  expiredApprovals: number
  sensitiveFileEvents: number
  archivedEvents: number
  supersededEvents: number
}
