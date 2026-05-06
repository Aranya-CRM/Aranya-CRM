import { Navigate, Route, Routes } from 'react-router-dom'
import { ManifestProtectedRoute } from './app/ManifestProtectedRoute'
import { APP_ROUTES } from './app/routeConfig'
import { LoginPage } from './pages/login/LoginPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<LoginPage />} />
      {APP_ROUTES.map((route) => (
        <Route
          key={route.path}
          path={route.path}
          element={
            <ManifestProtectedRoute routeId={route.routeId}>
              {route.element}
            </ManifestProtectedRoute>
          }
        />
      ))}
    </Routes>
  )
}

export default App
