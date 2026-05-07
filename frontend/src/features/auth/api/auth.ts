import {
  GoogleAuthProvider,
  TotpMultiFactorGenerator,
  getMultiFactorResolver,
  multiFactor,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type MultiFactorError,
  type MultiFactorResolver,
  type TotpSecret,
  type User,
} from 'firebase/auth'
import { firebaseAuth } from './firebase'

export type PrimarySignInResult =
  | { status: 'signed-in'; user: User }
  | { status: 'mfa-required'; resolver: MultiFactorResolver }

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

export async function signInWithGoogle(): Promise<PrimarySignInResult> {
  try {
    const credential = await signInWithPopup(firebaseAuth, new GoogleAuthProvider())
    return { status: 'signed-in', user: credential.user }
  } catch (error) {
    if (isMultiFactorRequired(error)) {
      return { status: 'mfa-required', resolver: getMultiFactorResolver(firebaseAuth, error as MultiFactorError) }
    }
    throw error
  }
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

export async function getFirebaseIdToken(forceRefresh = false): Promise<string | null> {
  return firebaseAuth.currentUser?.getIdToken(forceRefresh) ?? null
}

export async function logoutFirebase(): Promise<void> {
  await signOut(firebaseAuth)
}

export function subscribeFirebaseAuth(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(firebaseAuth, callback)
}
