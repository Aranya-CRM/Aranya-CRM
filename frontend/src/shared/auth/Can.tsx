import type { ReactNode } from 'react'
import { useAccess } from './useAccess'
import type { DataObject } from '../../types/capManifest'

interface CanProps {
  // ── v1 legacy props ────────────────────────────────────────────────────────
  feature?: string
  route?: string
  widget?: string
  // ── v2 cap-key props ───────────────────────────────────────────────────────
  /** v2 cap key (e.g. 'cases:view'). Evaluated via EvaluationEngine.resolve(). */
  cap?: string
  /** Data object for OWN / TEAM / WORKFLOW scope resolution. */
  object?: DataObject
  // ──────────────────────────────────────────────────────────────────────────
  fallback?: ReactNode
  children: ReactNode
}

export function Can({ feature, route, widget, cap, object, fallback = null, children }: CanProps) {
  const { canFeature, canRoute, canWidget, resolve } = useAccess()

  const allowed =
    (!feature || canFeature(feature)) &&
    (!route   || canRoute(route))     &&
    (!widget  || canWidget(widget))   &&
    (!cap     || resolve(cap, object))

  return <>{allowed ? children : fallback}</>
}
