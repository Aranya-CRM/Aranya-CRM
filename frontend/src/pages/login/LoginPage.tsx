import { useEffect, useState, type FormEvent } from 'react'
import { FirebaseError } from 'firebase/app'
import type { MultiFactorResolver, TotpSecret, User } from 'firebase/auth'
import QRCode from 'qrcode'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  completeTotpSignIn,
  finishTotpEnrollment,
  hasTotpFactor,
  logoutFirebase,
  sendVerificationEmail,
  signInWithGoogle,
  signInWithPassword,
  startTotpEnrollment,
} from '../../services/auth'
import { firebaseAuth } from '../../services/firebase'
import './login.css'

type LoginStep =
  | 'credentials'
  | 'email-verification'
  | 'totp-challenge'
  | 'totp-enrollment'

function normalizeFirebaseError(error: unknown): string {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return '邮箱或密码不正确。 / Invalid email or password.'
      case 'auth/popup-closed-by-user':
        return 'Google 登录窗口已关闭。 / Google sign-in was cancelled.'
      case 'auth/too-many-requests':
        return '尝试次数过多，请稍后再试。 / Too many attempts. Please try again later.'
      case 'auth/invalid-verification-code':
        return '验证码不正确，请重新输入。 / Invalid authentication code.'
      default:
        return `${error.message} / Authentication failed.`
    }
  }

  if (error instanceof Error) {
    return error.message
  }

  return '登录失败，请稍后再试。 / Unable to sign in. Please try again.'
}

export function LoginPage() {
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
  const [totpQrDataUrl, setTotpQrDataUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [noticeMessage, setNoticeMessage] = useState<string>()
  const [errorMessage, setErrorMessage] = useState<string>()

  useEffect(() => {
    let active = true

    async function buildQrCode() {
      if (!totpQrUri) {
        setTotpQrDataUrl('')
        return
      }

      try {
        const dataUrl = await QRCode.toDataURL(totpQrUri, {
          errorCorrectionLevel: 'M',
          margin: 2,
          scale: 6,
          width: 180,
        })

        if (active) {
          setTotpQrDataUrl(dataUrl)
        }
      } catch {
        if (active) {
          setTotpQrDataUrl('')
        }
      }
    }

    void buildQrCode()

    return () => {
      active = false
    }
  }, [totpQrUri])

  if (authenticated) {
    return <Navigate to="/dashboard" replace />
  }

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
      setErrorMessage('登录状态已失效，请重新登录。 / Sign-in state expired. Please try again.')
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
      setErrorMessage('登录状态已失效，请重新登录。 / Sign-in state expired. Please try again.')
      resetLoginState()
      return
    }

    setSubmitting(true)
    setErrorMessage(undefined)

    try {
      await finishTotpEnrollment(user, totpSecret, setupCode)
      await logoutFirebase()
      resetLoginState()
      setNoticeMessage('认证器已绑定，请重新登录并输入验证码。 / Authenticator linked. Please sign in again.')
    } catch (error) {
      setErrorMessage(normalizeFirebaseError(error))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSendVerificationEmail() {
    const user = firebaseAuth.currentUser

    if (!user) {
      setErrorMessage('登录状态已失效，请重新登录。 / Sign-in state expired. Please try again.')
      resetLoginState()
      return
    }

    setSubmitting(true)
    setErrorMessage(undefined)

    try {
      await sendVerificationEmail(user)
      setNoticeMessage('验证邮件已发送。 / Verification email sent.')
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
    setTotpQrDataUrl('')
    setErrorMessage(undefined)
  }

  function renderStep() {
    if (step === 'email-verification') {
      return (
        <div className="login-form">
          <div className="login-copy-zh">请先验证邮箱：{firebaseAuth.currentUser?.email ?? email}</div>
          <div className="login-copy-en">Verify your email address before continuing.</div>
          {noticeMessage ? <div className="login-notice">{noticeMessage}</div> : null}
          {errorMessage ? <div className="login-error">{errorMessage}</div> : null}
          <button className="login-submit" type="button" onClick={handleSendVerificationEmail} disabled={submitting}>
            {submitting ? '发送中... / Sending...' : '发送验证邮件 / Send Verification Email'}
          </button>
          <button className="login-back" type="button" onClick={resetLoginState} disabled={submitting}>
            返回登录 / Back to Sign In
          </button>
        </div>
      )
    }

    if (step === 'totp-challenge') {
      return (
        <form className="login-form" onSubmit={handleTotpChallenge}>
          <label className="login-field">
            <span className="login-label-zh">认证器验证码</span>
            <span className="login-label-en">Authenticator Code</span>
            <input
              className="login-input login-input-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={totpCode}
              onChange={(event) => setTotpCode(event.target.value)}
              required
            />
          </label>
          {errorMessage ? <div className="login-error">{errorMessage}</div> : null}
          <button className="login-submit" type="submit" disabled={submitting}>
            {submitting ? '验证中... / Verifying...' : '验证并进入 / Verify'}
          </button>
          <button className="login-back" type="button" onClick={resetLoginState} disabled={submitting}>
            返回登录 / Back to Sign In
          </button>
        </form>
      )
    }

    if (step === 'totp-enrollment') {
      return (
        <form className="login-form" onSubmit={handleTotpEnrollment}>
          <div className="login-setup-block">
            <div className="login-setup-label-zh">绑定认证器</div>
            <div className="login-setup-label-en">Link an authenticator app</div>
            <div className="login-setup-hint-zh">在认证器 App 中添加以下密钥，然后输入 6 位验证码。</div>
            <div className="login-setup-hint-en">Add this secret to your authenticator app, then enter the 6-digit code.</div>
            {totpQrDataUrl ? (
              <div className="login-setup-qr-wrap">
                <img className="login-setup-qr" src={totpQrDataUrl} alt="Authenticator QR code" />
                <div className="login-setup-qr-hint-zh">Scan with authenticator app</div>
                <div className="login-setup-qr-hint-en">Scan this QR code with your authenticator app.</div>
              </div>
            ) : null}
            <div className="login-setup-secret-row">
              <div className="login-setup-secret">{totpSecretKey}</div>
            </div>
            <div className="login-setup-hint-en">Manual setup key</div>
          </div>
          <label className="login-field">
            <span className="login-label-zh">验证码</span>
            <span className="login-label-en">Code</span>
            <input
              className="login-input login-input-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={setupCode}
              onChange={(event) => setSetupCode(event.target.value)}
              required
            />
          </label>
          {errorMessage ? <div className="login-error">{errorMessage}</div> : null}
          <button className="login-submit" type="submit" disabled={submitting}>
            {submitting ? '绑定中... / Linking...' : '绑定认证器 / Link Authenticator'}
          </button>
          <button className="login-back" type="button" onClick={resetLoginState} disabled={submitting}>
            返回登录 / Back to Sign In
          </button>
        </form>
      )
    }

    return (
      <form className="login-form" onSubmit={handlePasswordLogin}>
        <label className="login-field">
          <span className="login-label-zh">邮箱</span>
          <span className="login-label-en">Email</span>
          <input
            className="login-input"
            type="email"
            autoComplete="username"
            placeholder="name@example.org"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

        <label className="login-field">
          <span className="login-label-zh">密码</span>
          <span className="login-label-en">Password</span>
          <input
            className="login-input"
            type="password"
            autoComplete="current-password"
            placeholder="At least 6 characters"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={6}
            required
          />
        </label>

        {noticeMessage ? <div className="login-notice">{noticeMessage}</div> : null}
        {errorMessage ? <div className="login-error">{errorMessage}</div> : null}

        <button className="login-submit" type="submit" disabled={submitting}>
          {submitting ? '登录中... / Signing In...' : '邮箱登录 / Sign In'}
        </button>
        <button className="login-secondary" type="button" onClick={handleGoogleLogin} disabled={submitting}>
          使用 Google 登录 / Continue with Google
        </button>
      </form>
    )
  }

  return (
    <div className="login-page">
      <aside className="login-aside">
        <div className="login-brand">
          <h1 className="login-brand-title">阿兰若个案管理系统</h1>
          <div className="login-brand-subtitle">Aranya CRM</div>
          <div className="login-brand-copy-zh">
            使用 Firebase 登录，并通过认证器完成二次验证后进入工作台。
          </div>
          <div className="login-brand-copy-en">
            Sign in with Firebase and complete authenticator verification to continue.
          </div>
        </div>

        <div className="login-side-card">
          <div className="login-side-card-title">登录说明</div>
          <div className="login-side-card-subtitle">Sign-in Notes</div>
          <ul className="login-side-list">
            <li>
              <span className="login-side-item-zh">支持邮箱密码和 Google 登录</span>
              <span className="login-side-item-en">Email/password and Google sign-in are supported.</span>
            </li>
            <li>
              <span className="login-side-item-zh">完成 TOTP 后，后端会校验 Firebase ID token</span>
              <span className="login-side-item-en">The backend verifies the final Firebase ID token.</span>
            </li>
            <li>
              <span className="login-side-item-zh">只有本系统已授权且启用的账号可以进入</span>
              <span className="login-side-item-en">Only active CRM users can access the workspace.</span>
            </li>
          </ul>
        </div>
      </aside>

      <main className="login-main">
        <section className="login-card" aria-label="Login Form">
          <h2 className="login-title">登录</h2>
          <div className="login-subtitle">Login</div>
          <div className="login-copy-zh">请选择登录方式，并根据提示完成邮箱验证或认证器验证。</div>
          <div className="login-copy-en">
            Choose a sign-in method and complete any required email or authenticator verification.
          </div>

          {renderStep()}

          <div className="login-footnote">
            后端认证入口: GET /api/v1/auth/me
          </div>
        </section>
      </main>
    </div>
  )
}
