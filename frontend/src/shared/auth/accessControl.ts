import type { UiManifest } from '../../types/uiManifest'

type CapabilityKey = 'routes' | 'features' | 'widgets'

function hasCapability(manifest: UiManifest | null, key: CapabilityKey, id: string): boolean {
  return Boolean(manifest?.[key].includes(id))
}

export function canAccessRoute(manifest: UiManifest | null, routeId: string): boolean {
  return hasCapability(manifest, 'routes', routeId)
}

export function canAccessFeature(manifest: UiManifest | null, featureId: string): boolean {
  return hasCapability(manifest, 'features', featureId)
}

export function canAccessWidget(manifest: UiManifest | null, widgetId: string): boolean {
  return hasCapability(manifest, 'widgets', widgetId)
}
