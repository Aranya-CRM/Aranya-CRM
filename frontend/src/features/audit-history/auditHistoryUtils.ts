import type { AuditAction, AuditCategory, AuditScope, AuditTrailEntry, AuditTrailSummary } from './types'

const APPROVAL_AUDIT_ACTIONS = new Set<AuditAction>([
  'CASE_CREATE',
  'DELETE_CASE',
  'DELETE_CLIENT',
  'DELETE_REPORT',
  'CASE_SERVICE_UPDATE',
  'CLIENT_CREATE',
  'CLIENT_UPDATE',
  'SENSITIVE_FILE_ARCHIVE',
  'SENSITIVE_FILE_RESTORE',
  'SENSITIVE_FILE_SUPERSEDE',
  'SENSITIVE_FILE_VERSION_CREATE',
])

export const AUDIT_ENTRY_MUTATION_POLICY = {
  businessUserCanEdit: false,
  businessUserCanDelete: false,
  adminCanEditThroughApp: false,
  adminCanDeleteThroughApp: false,
} as const

export function isApprovalAuditableAction(action: AuditAction): boolean {
  return APPROVAL_AUDIT_ACTIONS.has(action)
}

export function buildAuditTrail(entries: AuditTrailEntry[], scope: AuditScope): AuditTrailEntry[] {
  return entries
    .filter((entry) => entry.approvalRequired && isApprovalAuditableAction(entry.action))
    .filter((entry) => matchesScope(entry, scope))
    .slice()
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
}

export function summarizeAuditTrail(entries: AuditTrailEntry[]): AuditTrailSummary {
  return entries.reduce<AuditTrailSummary>((summary, entry) => {
    summary.totalEvents += 1
    if (entry.decisionStatus === 'pending') summary.pendingApprovals += 1
    if (entry.decisionStatus === 'approved') summary.approvedApprovals += 1
    if (entry.decisionStatus === 'rejected') summary.rejectedApprovals += 1
    if (entry.decisionStatus === 'expired') summary.expiredApprovals += 1
    if (entry.targetType === 'SENSITIVE_FILE') summary.sensitiveFileEvents += 1
    if (entry.lifecycleStatus === 'archived') summary.archivedEvents += 1
    if (entry.lifecycleStatus === 'superseded') summary.supersededEvents += 1
    return summary
  }, {
    totalEvents: 0,
    pendingApprovals: 0,
    approvedApprovals: 0,
    rejectedApprovals: 0,
    expiredApprovals: 0,
    sensitiveFileEvents: 0,
    archivedEvents: 0,
    supersededEvents: 0,
  })
}

export function auditCategoryForEntry(entry: Pick<AuditTrailEntry, 'action' | 'targetType'>): Exclude<AuditCategory, 'all'> {
  if (entry.action === 'CASE_SERVICE_UPDATE' || entry.targetType === 'SERVICE') return 'service'
  if (entry.action === 'DELETE_CLIENT' || entry.action === 'CLIENT_CREATE' || entry.action === 'CLIENT_UPDATE' || entry.targetType === 'CLIENT') return 'member'
  if (entry.action.startsWith('SENSITIVE_FILE_') || entry.targetType === 'SENSITIVE_FILE') return 'file'
  if (entry.action === 'DELETE_REPORT') return 'report'
  return 'case'
}

export function filterAuditTrail(entries: AuditTrailEntry[], category: AuditCategory): AuditTrailEntry[] {
  if (category === 'all') return entries
  return entries.filter((entry) => auditCategoryForEntry(entry) === category)
}

function matchesScope(entry: AuditTrailEntry, scope: AuditScope): boolean {
  if (entry.targetType === scope.targetType && String(entry.targetId) === String(scope.targetId)) return true
  if (scope.targetType === 'CASE' && String(entry.caseId) === String(scope.targetId)) return true
  return false
}
