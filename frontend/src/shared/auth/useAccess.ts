import { useMemo } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import {
  canAccessFeature,
  canAccessRoute,
  canAccessWidget,
} from './accessControl'
import { resolve as resolveEngine } from './evaluationEngine'
import type { DataObject, ScopeValue } from '../../types/capManifest'

export function useAccess() {
  const { manifest, caps, user } = useAuth()
  const userId = user?.id ?? 0

  return useMemo(() => ({
    // ── v1 legacy (dot-notation feature codes) ────────────────────────────────
    canRoute:   (routeId: string)   => canAccessRoute(manifest, routeId),
    canFeature: (featureId: string) => canAccessFeature(manifest, featureId),
    canWidget:  (widgetId: string)  => canAccessWidget(manifest, widgetId),

    // ── v2 cap-key API ────────────────────────────────────────────────────────
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
  }), [manifest, caps, userId])
}
