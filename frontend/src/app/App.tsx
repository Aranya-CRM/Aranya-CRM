import { Navigate, Route, Routes } from 'react-router-dom'
import { ManifestProtectedRoute } from './ManifestProtectedRoute'
import { PROTECTED_ROUTES, PUBLIC_ROUTES } from './router'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
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
