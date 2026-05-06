import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  clearSession,
  getAccessToken,
} from '../services/auth'
import { getCurrentUser, type MeResponse } from '../services/user.api'
import { getUiManifest } from '../services/uiManifest.api'
import type { UiManifest } from '../types/uiManifest'

interface AuthContextValue {
  /** True while the initial session + UI manifest fetch is in flight. */
  loading: boolean
  authenticated: boolean
  user: MeResponse | null
  manifest: UiManifest | null
  canRoute: (routeId: string) => boolean
  canFeature: (featureId: string) => boolean
  canWidget: (widgetId: string) => boolean
  /** Re-fetch profile + UI manifest. Call this after a successful login flow completes. */
  refreshUser: () => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<MeResponse | null>(null)
  const [manifest, setManifest] = useState<UiManifest | null>(null)

  const refreshUser = useCallback(async () => {
    if (!getAccessToken()) {
      setUser(null)
      setManifest(null)
      return
    }
    try {
      const [me, uiManifest] = await Promise.all([
        getCurrentUser(),
        getUiManifest(),
      ])
      setUser(me)
      setManifest(uiManifest)
    } catch {
      // Token invalid / expired / network failure — drop session so the user
      // gets bounced to the login page on the next protected-route render.
      clearSession()
      setUser(null)
      setManifest(null)
    }
  }, [])

  useEffect(() => {
    void refreshUser().finally(() => setLoading(false))
  }, [refreshUser])

  const value = useMemo<AuthContextValue>(() => {
    const canRoute = (routeId: string) => Boolean(manifest?.routes.includes(routeId))
    const canFeature = (featureId: string) => Boolean(manifest?.features.includes(featureId))
    const canWidget = (widgetId: string) => Boolean(manifest?.widgets.includes(widgetId))

    return {
      loading,
      authenticated: user !== null && manifest !== null,
      user,
      manifest,
      canRoute,
      canFeature,
      canWidget,
      refreshUser,
      logout: () => {
        clearSession()
        setUser(null)
        setManifest(null)
        window.location.href = '/login'
      },
    }
  }, [loading, user, manifest, refreshUser])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
