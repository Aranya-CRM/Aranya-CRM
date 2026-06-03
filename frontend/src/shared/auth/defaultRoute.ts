import type { UiManifest } from '../../types/uiManifest'

export function getDefaultRoute(manifest: UiManifest | null): string {
  const routes = manifest?.routes ?? []
  if (routes.includes('tasks.list')) return '/tasks'
  if (routes.includes('dashboard')) return '/dashboard'
  if (routes.includes('clients.list')) return '/clients'
  if (routes.includes('cases.list')) return '/cases'
  if (routes.includes('reports.list')) return '/reports'
  return '/login'
}
