import type { ScopeValue } from '../../types/capManifest'

function hasCap(caps: Record<string, ScopeValue>, capKey: string): boolean {
  return ['YES', 'ALL', 'OWN', 'TEAM', 'WORKFLOW'].includes(caps[capKey] ?? 'NO')
}

export function getDefaultRoute(
  caps: Record<string, ScopeValue> = {},
): string {
  const isVolunteerOnly = (hasCap(caps, 'route:reports') || hasCap(caps, 'route:tasks'))
    && !hasCap(caps, 'route:clients')
    && !hasCap(caps, 'route:cases')

  if (isVolunteerOnly) return '/reports'

  const isManager = caps['cases:audit'] === 'YES' || caps['cases:audit'] === 'ALL'
  if (isManager && hasCap(caps, 'route:dashboard')) return '/dashboard'

  if (hasCap(caps, 'route:clients')) return '/clients'
  if (hasCap(caps, 'route:cases')) return '/cases'
  if (hasCap(caps, 'route:reports')) return '/reports'
  if (hasCap(caps, 'route:dashboard')) return '/dashboard'

  return '/login'
}
