import type { DataObject, ScopeValue } from '../../types/capManifest'

export type Decision = 'GRANT' | 'DENY'

/**
 * Core cap evaluation function — intentionally pure and free of React dependencies.
 *
 * Scope resolution rules:
 *   ALL      → GRANT unconditionally
 *   YES      → GRANT unconditionally (binary capability, no data scope)
 *   OWN      → GRANT iff object.ownerId === userId
 *   TEAM     → GRANT iff object.teamId  === teamId
 *   WORKFLOW → GRANT (cap exists; workflow state enforcement is Phase 3 + backend)
 *   absent   → DENY  (no entry in caps map = NO permission)
 */
export function resolve(
  caps: Record<string, ScopeValue>,
  userId: string | number,
  capKey: string,
  object?: DataObject,
  teamId?: string | number,
): Decision {
  const scope = caps[capKey]
  if (!scope) return 'DENY'

  switch (scope) {
    case 'ALL':
    case 'YES':
      return 'GRANT'

    case 'OWN':
      return object?.ownerId != null && String(object.ownerId) === String(userId)
        ? 'GRANT'
        : 'DENY'

    case 'TEAM':
      return object?.teamId != null && teamId != null && String(object.teamId) === String(teamId)
        ? 'GRANT'
        : 'DENY'

    case 'WORKFLOW':
      // Phase 2: treat as GRANT — the user participates in this workflow.
      // Component should use getCap() to detect WORKFLOW and apply state-specific disabling.
      return 'GRANT'

    default:
      return 'DENY'
  }
}
