import type { UiManifest } from '../../types/uiManifest'
import type { ScopeValue } from '../../types/capManifest'

function hasAnyRoute(routes: string[], ...routeIds: string[]): boolean {
  return routeIds.some((routeId) => routes.includes(routeId))
}

export function getDefaultRoute(
  manifest: UiManifest | null,
  caps: Record<string, ScopeValue> = {},
): string {
  const routes = manifest?.routes ?? []
  const isVolunteerOnly = hasAnyRoute(routes, 'tasks.list', 'route:tasks')
    && !hasAnyRoute(routes, 'clients.list', 'route:clients')
    && !hasAnyRoute(routes, 'cases.list', 'route:cases')

  if (isVolunteerOnly) return '/tasks'

  const isManager = caps['cases:audit'] === 'YES' || caps['cases:audit'] === 'ALL'
  if (isManager && hasAnyRoute(routes, 'dashboard', 'route:dashboard')) return '/dashboard'

  if (hasAnyRoute(routes, 'clients.list', 'route:clients')) return '/clients'
  if (hasAnyRoute(routes, 'cases.list', 'route:cases')) return '/cases'
  if (hasAnyRoute(routes, 'reports.list', 'route:reports')) return '/reports'
  if (hasAnyRoute(routes, 'tasks.list', 'route:tasks')) return '/tasks'
  if (hasAnyRoute(routes, 'dashboard', 'route:dashboard')) return '/dashboard'

  return '/login'
}
