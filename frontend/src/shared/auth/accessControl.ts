import type { UiManifest } from '../../types/uiManifest'

type CapabilityKey = 'routes' | 'features' | 'widgets'

function hasCapability(manifest: UiManifest | null, key: CapabilityKey, id: string): boolean {
  return Boolean(manifest?.[key].includes(id))
}

/** @deprecated Use `useAccess().resolve(capKey)` with v2 cap keys instead. */
export function canAccessRoute(manifest: UiManifest | null, routeId: string): boolean {
  return hasCapability(manifest, 'routes', routeId)
}

/** @deprecated Use `useAccess().resolve(capKey)` with v2 cap keys instead. */
export function canAccessFeature(manifest: UiManifest | null, featureId: string): boolean {
  return hasCapability(manifest, 'features', featureId)
}

/** @deprecated Use `useAccess().resolve(capKey)` with v2 cap keys instead. */
export function canAccessWidget(manifest: UiManifest | null, widgetId: string): boolean {
  return hasCapability(manifest, 'widgets', widgetId)
}
