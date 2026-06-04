import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { Spin } from 'antd'
import { useAuth } from '../contexts/AuthContext'
import { AppLayout } from '../shared/layout'
import { useAccess } from '../shared/auth'
import { getDefaultRoute } from '../shared/auth/defaultRoute'
import '../shared/ui/shared.css'

interface ManifestProtectedRouteProps {
  routeId: string
  children: ReactNode
}

export function ManifestProtectedRoute({ routeId, children }: ManifestProtectedRouteProps) {
  const { loading, authenticated, manifest } = useAuth()
  const { canRoute, resolve } = useAccess()

  if (loading) {
    return (
      <div className="route-loading">
        <Spin size="large" />
      </div>
    )
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />
  }

  const allowed = resolve(routeId) || canRoute(routeId)
  if (!allowed) {
    return <Navigate to={getDefaultRoute(manifest)} replace />
  }

  return <AppLayout>{children}</AppLayout>
}
