export type ScopeValue = 'ALL' | 'OWN' | 'TEAM' | 'YES' | 'NO' | 'WORKFLOW'

/** Response shape from GET /api/v2/ui/manifest */
export interface CapsManifest {
  caps: Record<string, ScopeValue>
}

/**
 * Runtime data context passed to resolve() when evaluating OWN / TEAM / WORKFLOW scopes.
 * Absent fields are treated as unknown — resolution falls back to DENY for those scopes.
 */
export interface DataObject {
  /** Numeric or string ID of the record's assigned owner (for OWN scope) */
  ownerId?: string | number
  /** Team identifier of the record (for TEAM scope) */
  teamId?: string | number
  /** Current workflow state of the record (for WORKFLOW scope — Phase 3) */
  workflowState?: string
}
