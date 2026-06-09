import { Navigate, Route, Routes } from 'react-router-dom'
import { ManifestProtectedRoute } from './ManifestProtectedRoute'
import { PROTECTED_ROUTES, PUBLIC_ROUTES } from './router'
import { useAuth } from '../contexts/AuthContext'
import { getDefaultRoute } from '../shared/auth/defaultRoute'

function DefaultRedirect() {
  const { loading, authenticated, manifest, caps } = useAuth()
  if (loading) return null
  return <Navigate to={authenticated ? getDefaultRoute(manifest, caps) : '/login'} replace />
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<DefaultRedirect />} />
      {PUBLIC_ROUTES.map((route) => (
        <Route
          key={route.path}
          path={route.path}
          element={route.element}
        />
      ))}
      {PROTECTED_ROUTES.map((route) => (
        <Route
          key={route.path}
          path={route.path}
          element={
            <ManifestProtectedRoute routeId={route.routeId!}>
              {route.element}
            </ManifestProtectedRoute>
          }
        />
      ))}
    </Routes>
  )
}

export default App
