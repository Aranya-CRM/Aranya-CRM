import { useMemo } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { resolve as resolveEngine } from './evaluationEngine'
import type { DataObject, ScopeValue } from '../../types/capManifest'

export function useAccess() {
  const { caps, user } = useAuth()
  const userId = user?.id ?? 0

  return useMemo(() => ({
    canRoute: (routeId: string) => resolveEngine(caps, userId, routeId) === 'GRANT',
    canFeature: (featureId: string) => resolveEngine(caps, userId, featureId) === 'GRANT',
    canWidget: (widgetId: string) => resolveEngine(caps, userId, widgetId) === 'GRANT',

    /** Raw scope value for a cap key. Returns 'NO' when absent. */
    getCap: (capKey: string): ScopeValue => (caps[capKey] ?? 'NO') as ScopeValue,

    /**
     * Returns true when the current user is GRANTED the cap for the given data object.
     *
     * - No object needed for ALL / YES caps.
     * - Pass `{ ownerId }` for OWN-scoped caps.
     * - WORKFLOW caps return true (Phase 2); use getCap() to detect WORKFLOW and apply UI state logic.
     */
    resolve: (capKey: string, object?: DataObject): boolean =>
      resolveEngine(caps, userId, capKey, object) === 'GRANT',
  }), [caps, userId])
}
