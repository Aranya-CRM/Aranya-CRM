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

  // 后台管理型用户(如 ADMIN):能进后台(admin:console.access)但没有业务个案路由 → 登录直接落到后台控制台。
  // 有 route:cases 的管理者(MANAGER 等)虽也能进后台,但主场是前台,仍落到业务页。
  const isBackendPrimary = hasCap(caps, 'admin:console.access') && !hasCap(caps, 'route:cases')
  if (isBackendPrimary) return '/admin/accounts'

  const isManager = caps['cases:audit'] === 'YES' || caps['cases:audit'] === 'ALL'
  if (isManager && hasCap(caps, 'route:dashboard')) return '/dashboard'

  if (hasCap(caps, 'route:clients')) return '/clients'
  if (hasCap(caps, 'route:cases')) return '/cases'
  if (hasCap(caps, 'route:reports')) return '/reports'
  if (hasCap(caps, 'route:dashboard')) return '/dashboard'

  return '/login'
}
