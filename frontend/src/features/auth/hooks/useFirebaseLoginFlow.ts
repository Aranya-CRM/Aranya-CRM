import { useState, type FormEvent } from 'react'
import { FirebaseError } from 'firebase/app'
import type { MultiFactorResolver, TotpSecret, User } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import i18n from '../../../i18n'
import { useAuth } from '../../../contexts/AuthContext'
import {
  completeTotpSignIn,
  finishTotpEnrollment,
  hasTotpFactor,
  logoutFirebase,
  sendVerificationEmail,
  signInWithGoogle,
  signInWithPassword,
  startTotpEnrollment,
} from '../api/auth'
import { firebaseAuth } from '../api/firebase'
import { useTotpQrCode } from './useTotpQrCode'

export type LoginStep =
  | 'credentials'
  | 'email-verification'
  | 'totp-challenge'
  | 'totp-enrollment'

function normalizeFirebaseError(error: unknown): string {
  const t = i18n.t.bind(i18n)

  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return t('auth.error.invalidCredential')
      case 'auth/popup-closed-by-user':
        return t('auth.error.popupClosed')
      case 'auth/too-many-requests':
        return t('auth.error.tooManyRequests')
      case 'auth/invalid-verification-code':
        return t('auth.error.invalidCode')
      default:
        return error.message
    }
  }

  if (error instanceof Error) {
    return error.message
  }

  return t('auth.error.generic')
}

export function useFirebaseLoginFlow() {
  const navigate = useNavigate()
  const { authenticated, refreshUser } = useAuth()

  const [step, setStep] = useState<LoginStep>('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [setupCode, setSetupCode] = useState('')
  const [mfaResolver, setMfaResolver] = useState<MultiFactorResolver | null>(null)
  const [totpSecret, setTotpSecret] = useState<TotpSecret | null>(null)
  const [totpSecretKey, setTotpSecretKey] = useState('')
  const [totpQrUri, setTotpQrUri] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [noticeMessage, setNoticeMessage] = useState<string>()
  const [errorMessage, setErrorMessage] = useState<string>()
  const totpQrDataUrl = useTotpQrCode(totpQrUri)

  async function finishBackendCheck(user: User) {
    await user.getIdToken(true)
    await refreshUser()
    navigate('/dashboard', { replace: true })
  }

  async function continueAfterPrimarySignIn(user: User) {
    if (!user.emailVerified) {
      setStep('email-verification')
      return
    }

    if (!hasTotpFactor(user)) {
      const enrollment = await startTotpEnrollment(user)
      setTotpSecret(enrollment.secret)
      setTotpSecretKey(enrollment.secretKey)
      setTotpQrUri(enrollment.qrUri)
      setStep('totp-enrollment')
      return
    }

    await finishBackendCheck(user)
  }

  async function handlePasswordLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setNoticeMessage(undefined)
    setErrorMessage(undefined)

    try {
      const result = await signInWithPassword(email, password)

      if (result.status === 'mfa-required') {
        setMfaResolver(result.resolver)
        setStep('totp-challenge')
        return
      }

      await continueAfterPrimarySignIn(result.user)
    } catch (error) {
      setErrorMessage(normalizeFirebaseError(error))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGoogleLogin() {
    setSubmitting(true)
    setNoticeMessage(undefined)
    setErrorMessage(undefined)

    try {
      const result = await signInWithGoogle()

      if (result.status === 'mfa-required') {
        setMfaResolver(result.resolver)
        setStep('totp-challenge')
        return
      }

      await continueAfterPrimarySignIn(result.user)
    } catch (error) {
      setErrorMessage(normalizeFirebaseError(error))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleTotpChallenge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!mfaResolver) {
      setErrorMessage(i18n.t('auth.error.stateExpired'))
      resetLoginState()
      return
    }

    setSubmitting(true)
    setErrorMessage(undefined)

    try {
      const user = await completeTotpSignIn(mfaResolver, totpCode)
      await finishBackendCheck(user)
    } catch (error) {
      setErrorMessage(normalizeFirebaseError(error))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleTotpEnrollment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const user = firebaseAuth.currentUser
    if (!user || !totpSecret) {
      setErrorMessage(i18n.t('auth.error.stateExpired'))
      resetLoginState()
      return
    }

    setSubmitting(true)
    setErrorMessage(undefined)

    try {
      await finishTotpEnrollment(user, totpSecret, setupCode)
      await logoutFirebase()
      resetLoginState()
      setNoticeMessage(i18n.t('auth.error.authenticatorLinked'))
    } catch (error) {
      setErrorMessage(normalizeFirebaseError(error))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSendVerificationEmail() {
    const user = firebaseAuth.currentUser

    if (!user) {
      setErrorMessage(i18n.t('auth.error.stateExpired'))
      resetLoginState()
      return
    }

    setSubmitting(true)
    setErrorMessage(undefined)

    try {
      await sendVerificationEmail(user)
      setNoticeMessage(i18n.t('auth.error.verificationSent'))
    } catch (error) {
      setErrorMessage(normalizeFirebaseError(error))
    } finally {
      setSubmitting(false)
    }
  }

  function resetLoginState() {
    setStep('credentials')
    setPassword('')
    setTotpCode('')
    setSetupCode('')
    setMfaResolver(null)
    setTotpSecret(null)
    setTotpSecretKey('')
    setTotpQrUri('')
    setErrorMessage(undefined)
  }

  return {
    authenticated,
    step,
    email,
    password,
    totpCode,
    setupCode,
    totpSecretKey,
    totpQrDataUrl,
    verificationEmail: firebaseAuth.currentUser?.email ?? email,
    submitting,
    noticeMessage,
    errorMessage,
    setEmail,
    setPassword,
    setTotpCode,
    setSetupCode,
    handlePasswordLogin,
    handleGoogleLogin,
    handleTotpChallenge,
    handleTotpEnrollment,
    handleSendVerificationEmail,
    resetLoginState,
  }
}
