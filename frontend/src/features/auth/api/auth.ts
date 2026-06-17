import { FirebaseError } from 'firebase/app'
import {
  GoogleAuthProvider,
  TotpMultiFactorGenerator,
  getMultiFactorResolver,
  linkWithCredential,
  multiFactor,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type AuthCredential,
  type MultiFactorError,
  type MultiFactorResolver,
  type TotpSecret,
  type User,
} from 'firebase/auth'
import { firebaseAuth } from './firebase'

export type PrimarySignInResult =
  | { status: 'signed-in'; user: User }
  | { status: 'mfa-required'; resolver: MultiFactorResolver }

export type GoogleSignInResult =
  | PrimarySignInResult
  // 同邮箱已存在其它登录方式(如密码),需先用既有方式登录再链接 Google
  | { status: 'link-required'; credential: AuthCredential; email: string }

function isMultiFactorRequired(error: unknown): boolean {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && error.code === 'auth/multi-factor-auth-required'
}

export async function signInWithPassword(email: string, password: string): Promise<PrimarySignInResult> {
  try {
    const credential = await signInWithEmailAndPassword(firebaseAuth, email, password)
    return { status: 'signed-in', user: credential.user }
  } catch (error) {
    if (isMultiFactorRequired(error)) {
      return { status: 'mfa-required', resolver: getMultiFactorResolver(firebaseAuth, error as MultiFactorError) }
    }
    throw error
  }
}

export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  try {
    const provider = new GoogleAuthProvider()
    // 每次都强制弹出 Google 账号选择，而不是静默沿用上次登录的账号
    provider.setCustomParameters({ prompt: 'select_account' })
    const credential = await signInWithPopup(firebaseAuth, provider)
    return { status: 'signed-in', user: credential.user }
  } catch (error) {
    if (isMultiFactorRequired(error)) {
      return { status: 'mfa-required', resolver: getMultiFactorResolver(firebaseAuth, error as MultiFactorError) }
    }
    // 邮箱已存在其它 provider(项目设置为"同邮箱合并"时抛此错)→ 返回待链接凭证
    const pending = extractPendingGoogleCredential(error)
    if (pending) {
      return { status: 'link-required', credential: pending.credential, email: pending.email }
    }
    throw error
  }
}

/** 从 account-exists-with-different-credential 错误中取出待链接的 Google 凭证与邮箱。 */
function extractPendingGoogleCredential(
  error: unknown,
): { credential: AuthCredential; email: string } | null {
  if (error instanceof FirebaseError && error.code === 'auth/account-exists-with-different-credential') {
    const credential = GoogleAuthProvider.credentialFromError(error)
    const email = (error.customData?.email as string | undefined) ?? ''
    if (credential) {
      return { credential, email }
    }
  }
  return null
}

/** 把待链接的凭证(如 Google)绑定到已登录用户,使其与既有账号共用同一 UID。 */
export async function linkPendingCredential(user: User, credential: AuthCredential): Promise<void> {
  await linkWithCredential(user, credential)
}

export async function completeTotpSignIn(resolver: MultiFactorResolver, code: string): Promise<User> {
  const hint = resolver.hints.find((item) => item.factorId === TotpMultiFactorGenerator.FACTOR_ID)

  if (!hint) {
    throw new Error('No TOTP factor is enrolled for this account.')
  }

  const assertion = TotpMultiFactorGenerator.assertionForSignIn(hint.uid, code)
  const credential = await resolver.resolveSignIn(assertion)
  return credential.user
}

export async function startTotpEnrollment(user: User): Promise<{
  secret: TotpSecret
  secretKey: string
  qrUri: string
}> {
  const session = await multiFactor(user).getSession()
  const secret = await TotpMultiFactorGenerator.generateSecret(session)

  return {
    secret,
    secretKey: secret.secretKey,
    qrUri: secret.generateQrCodeUrl(user.email ?? 'user', 'Aranya CRM'),
  }
}

export async function finishTotpEnrollment(user: User, secret: TotpSecret, code: string): Promise<void> {
  const assertion = TotpMultiFactorGenerator.assertionForEnrollment(secret, code)
  await multiFactor(user).enroll(assertion, 'Authenticator app')
}

export function hasTotpFactor(user: User): boolean {
  return multiFactor(user).enrolledFactors.some(
    (factor) => factor.factorId === TotpMultiFactorGenerator.FACTOR_ID,
  )
}

export async function sendVerificationEmail(user: User): Promise<void> {
  await sendEmailVerification(user)
}

/**
 * 给被邀请的用户发送"设置密码"邮件(复用 Firebase 密码重置邮件)。
 * 由 MANAGER 邀请成功后触发;不影响当前登录会话。
 */
export async function sendInviteSetupEmail(email: string): Promise<void> {
  await sendPasswordResetEmail(firebaseAuth, email)
}

export async function getFirebaseIdToken(forceRefresh = false): Promise<string | null> {
  return firebaseAuth.currentUser?.getIdToken(forceRefresh) ?? null
}

function waitForFirebaseUser(timeoutMs = 3000): Promise<User | null> {
  if (firebaseAuth.currentUser) {
    return Promise.resolve(firebaseAuth.currentUser)
  }

  return new Promise((resolve) => {
    const timeout = window.setTimeout(() => {
      unsubscribe()
      resolve(firebaseAuth.currentUser)
    }, timeoutMs)

    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      window.clearTimeout(timeout)
      unsubscribe()
      resolve(user)
    })
  })
}

export async function requireFirebaseIdToken(forceRefresh = false): Promise<string> {
  const user = firebaseAuth.currentUser ?? await waitForFirebaseUser()
  const token = await user?.getIdToken(forceRefresh)

  if (!token) {
    throw new Error('Authentication is still initializing. Please try again.')
  }

  return token
}

export async function logoutFirebase(): Promise<void> {
  await signOut(firebaseAuth)
}

export function subscribeFirebaseAuth(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(firebaseAuth, callback)
}
