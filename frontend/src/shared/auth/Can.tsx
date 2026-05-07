import type { ReactNode } from 'react'
import { useAccess } from './useAccess'

type CapabilityKind = 'feature' | 'route' | 'widget'

interface CanProps {
  feature?: string
  route?: string
  widget?: string
  fallback?: ReactNode
  children: ReactNode
}

export function Can({ feature, route, widget, fallback = null, children }: CanProps) {
  const { canFeature, canRoute, canWidget } = useAccess()

  const checks: Array<[CapabilityKind, string | undefined]> = [
    ['feature', feature],
    ['route', route],
    ['widget', widget],
  ]
  const activeChecks = checks.filter(([, value]) => Boolean(value))

  if (activeChecks.length === 0) {
    return <>{children}</>
  }

  const allowed = activeChecks.every(([kind, value]) => {
    if (!value) return true
    if (kind === 'feature') return canFeature(value)
    if (kind === 'route') return canRoute(value)
    return canWidget(value)
  })

  return <>{allowed ? children : fallback}</>
}
