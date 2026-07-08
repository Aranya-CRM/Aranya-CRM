import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Spin } from 'antd'
import { useAuth } from '../contexts/AuthContext'
import { AdminLayout, AppLayout } from '../shared/layout'
import { useAccess } from '../shared/auth'
import { getDefaultRoute } from '../shared/auth/defaultRoute'
import '../shared/ui/shared.css'

interface ManifestProtectedRouteProps {
  routeId: string
  children: ReactNode
}

export function ManifestProtectedRoute({ routeId, children }: ManifestProtectedRouteProps) {
  const { loading, authenticated, caps } = useAuth()
  const { canRoute, resolve } = useAccess()
  const location = useLocation()

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

  // 个人 Profile 对所有已登录用户开放,不受 cap 限制
  const allowed = routeId === 'route:profile'
    || caps[routeId] !== undefined || resolve(routeId) || canRoute(routeId)
  if (!allowed) {
    return <Navigate to={getDefaultRoute(caps)} replace />
  }

  // 后台管理路由用独立的 AdminLayout(自有侧栏),与业务前台的 AppLayout 分开。
  if (location.pathname.startsWith('/admin')) {
    return <AdminLayout>{children}</AdminLayout>
  }

  return <AppLayout>{children}</AppLayout>
}
