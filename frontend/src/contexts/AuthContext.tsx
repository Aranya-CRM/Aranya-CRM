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
  logoutFirebase,
  subscribeFirebaseAuth,
} from '../features/auth/api/auth'
import { getCurrentUser, type MeResponse } from '../features/auth/api/user.api'
import { getUiManifest } from '../features/auth/api/uiManifest.api'
import type { UiManifest } from '../types/uiManifest'

interface AuthContextValue {
  /** True while the Firebase session + backend profile check is in flight. */
  loading: boolean
  authenticated: boolean
  user: MeResponse | null
  manifest: UiManifest | null
  /** Re-fetch profile + UI manifest. Call this after a successful Firebase login flow completes. */
  refreshUser: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<MeResponse | null>(null)
  const [manifest, setManifest] = useState<UiManifest | null>(null)

  const refreshUser = useCallback(async () => {
    try {
      const [me, uiManifest] = await Promise.all([
        getCurrentUser(),
        getUiManifest(),
      ])
      setUser(me)
      setManifest(uiManifest)
    } catch {
      setUser(null)
      setManifest(null)
    }
  }, [])

  useEffect(() => {
    return subscribeFirebaseAuth((firebaseUser) => {
      setLoading(true)

      if (!firebaseUser) {
        setUser(null)
        setManifest(null)
        setLoading(false)
        return
      }

      void refreshUser().finally(() => setLoading(false))
    })
  }, [refreshUser])

  const value = useMemo<AuthContextValue>(() => {
    return {
      loading,
      authenticated: user !== null && manifest !== null,
      user,
      manifest,
      refreshUser,
      logout: async () => {
        await logoutFirebase()
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
