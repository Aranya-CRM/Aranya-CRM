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
import { getUiManifestV2 } from '../features/auth/api/uiManifestV2.api'
import type { UiManifest } from '../types/uiManifest'
import type { ScopeValue } from '../types/capManifest'

interface AuthContextValue {
  /** True while the Firebase session + backend profile check is in flight. */
  loading: boolean
  authenticated: boolean
  user: MeResponse | null
  manifest: UiManifest | null
  /** v2 cap-key → scope-value map. Empty when not loaded or unauthenticated. */
  caps: Record<string, ScopeValue>
  /** Re-fetch profile + UI manifests. Call this after a successful Firebase login. */
  refreshUser: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const EMPTY_CAPS: Record<string, ScopeValue> = {}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<MeResponse | null>(null)
  const [manifest, setManifest] = useState<UiManifest | null>(null)
  const [caps, setCaps] = useState<Record<string, ScopeValue>>(EMPTY_CAPS)

  const refreshUser = useCallback(async () => {
    try {
      const [me, uiManifest, capsManifest] = await Promise.all([
        getCurrentUser(),
        getUiManifest(),
        getUiManifestV2().catch((err) => { console.error('[caps] v2 manifest failed:', err); return { caps: EMPTY_CAPS } }),
      ])
      setUser(me)
      setManifest(uiManifest)
      setCaps(capsManifest.caps)
    } catch {
      setUser(null)
      setManifest(null)
      setCaps(EMPTY_CAPS)
    }
  }, [])

  useEffect(() => {
    return subscribeFirebaseAuth((firebaseUser) => {
      setLoading(true)

      if (!firebaseUser) {
        setUser(null)
        setManifest(null)
        setCaps(EMPTY_CAPS)
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
      caps,
      refreshUser,
      logout: async () => {
        await logoutFirebase()
        setUser(null)
        setManifest(null)
        setCaps(EMPTY_CAPS)
        window.location.href = '/login'
      },
    }
  }, [loading, user, manifest, caps, refreshUser])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
