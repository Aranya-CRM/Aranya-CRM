export type AuditAction = string

export type AuditTargetType = 'CASE' | 'CLIENT' | 'DOCUMENT' | 'SENSITIVE_FILE' | 'SERVICE' | 'CASE_NOTE' | 'SERVICE_EVENT' | 'REPORT'

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
  beforeValue?: string
  afterValue?: string
  result?: 'SUCCESS' | 'FAILED'
  source?: 'WEB' | 'API' | 'SYSTEM'
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
