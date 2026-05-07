import { useMemo } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import {
  canAccessFeature,
  canAccessRoute,
  canAccessWidget,
} from './accessControl'

export function useAccess() {
  const { manifest } = useAuth()

  return useMemo(() => ({
    canRoute: (routeId: string) => canAccessRoute(manifest, routeId),
    canFeature: (featureId: string) => canAccessFeature(manifest, featureId),
    canWidget: (widgetId: string) => canAccessWidget(manifest, widgetId),
  }), [manifest])
}
