import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { Spin } from 'antd'
import { AppLayout } from '../components/layout/AppLayout'
import { useAuth } from '../contexts/AuthContext'
import { useAccess } from '../shared/auth'
import '../shared/ui/shared.css'

interface ManifestProtectedRouteProps {
  routeId: string
  children: ReactNode
}

export function ManifestProtectedRoute({ routeId, children }: ManifestProtectedRouteProps) {
  const { loading, authenticated } = useAuth()
  const { canRoute } = useAccess()

  if (loading) {
    return (
      <div className="route-loading">
        <Spin size="large" tip="Loading..." />
      </div>
    )
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />
  }

  if (!canRoute(routeId)) {
    return <Navigate to="/dashboard" replace />
  }

  return <AppLayout>{children}</AppLayout>
}
