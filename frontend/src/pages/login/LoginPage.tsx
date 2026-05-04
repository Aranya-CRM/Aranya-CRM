import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { AxiosError } from 'axios'
import { useAuth } from '../../contexts/AuthContext'
import {
  enableTwoFactorInit,
  login,
  setupTwoFactorInit,
  verifyTwoFactor,
} from '../../services/auth'
import './login.css'

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const message = error.response?.data?.message

    if (typeof message === 'string' && message.trim()) {
      return `${message} / Login failed.`
    }
  }

  return '登录失败，请检查邮箱和密码后重试。 / Unable to sign in. Please check your email and password.'
}

export function LoginPage() {
  const navigate = useNavigate()
  const { authenticated, refreshAuth } = useAuth()

  const [step, setStep] = useState<LoginStep>('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>()

  if (authenticated) {
    return <Navigate to="/dashboard" replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setErrorMessage(undefined)

    try {
      const result = await login({ email, password })

      if (result.requiresTwoFactor && result.tempToken) {
        setTempToken(result.tempToken)
        setStep('totp')
        return
      }

      if (result.requiresTwoFactorSetup && result.tempToken) {
        setTempToken(result.tempToken)
        const setupData = await setupTwoFactorInit(result.tempToken)
        setSetupSecret(setupData.secret)
        setSetupQrBase64(setupData.qrCodeBase64 ?? '')
        setStep('setup')
        return
      }

      refreshAuth()
      navigate('/dashboard', { replace: true })
    } catch (error) {
      setErrorMessage(normalizeErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleTotpSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setErrorMessage(undefined)

    try {
      await verifyTwoFactor({ tempToken, code: totpCode })
      refreshAuth()
      navigate('/dashboard', { replace: true })
    } catch (error) {
      setErrorMessage(normalizeError(error, '验证码无效，请重新输入。 / Invalid code. Please try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSetupSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setErrorMessage(undefined)

    try {
      const result = await enableTwoFactorInit({ tempToken, secret: setupSecret, code: setupCode })
      refreshAuth()
      setBackupCodes(result.backupCodes ?? [])
      setStep('backup-codes')
    } catch (error) {
      setErrorMessage(normalizeError(error, '验证码不正确，请确认 App 中的代码后重试。 / Incorrect code. Please try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  function handleCopySecret() {
    void navigator.clipboard.writeText(setupSecret)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleBackToCredentials() {
    setStep('credentials')
    setTotpCode('')
    setSetupCode('')
    setTempToken('')
    setSetupSecret('')
    setErrorMessage(undefined)
  }

  return (
    <div className="login-page">
      <aside className="login-aside">
        <div className="login-brand">
          <h1 className="login-brand-title">阿兰若个案管理系统</h1>
          <div className="login-brand-subtitle">Aranya CRM</div>
          <div className="login-brand-copy-zh">
            通过统一的登录入口进入个案管理工作台，处理服务对象、预约与跟进事项。
          </div>
          <div className="login-brand-copy-en">
            Sign in through the shared access point to continue with case management,
            appointments, and follow-up work.
          </div>
        </div>

        <div className="login-side-card">
          <div className="login-side-card-title">登录说明</div>
          <div className="login-side-card-subtitle">Sign-in Notes</div>
          <ul className="login-side-list">
            <li>
              <span className="login-side-item-zh">使用后端已注册的邮箱和密码登录</span>
              <span className="login-side-item-en">Use an email and password that already exist in the backend.</span>
            </li>
            <li>
              <span className="login-side-item-zh">登录成功后会进入 Dashboard</span>
              <span className="login-side-item-en">After sign-in, you will be redirected to the dashboard.</span>
            </li>
            <li>
              <span className="login-side-item-zh">当前界面先保持轻量，后续可以再加记住登录或退出功能</span>
              <span className="login-side-item-en">This is a lightweight first pass and can later grow with remember-me and logout.</span>
            </li>
          </ul>
        </div>
      </aside>

      <main className="login-main">
        <section className="login-card" aria-label="Login Form">
          <h2 className="login-title">登录</h2>
          <div className="login-subtitle">Login</div>
          <div className="login-copy-zh">请输入邮箱和密码，系统将向后端认证接口发起登录请求。</div>
          <div className="login-copy-en">
            Enter your credentials and the page will submit them to the backend auth endpoint.
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
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
                placeholder="At least 8 characters"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                required
              />
            </label>

            {errorMessage ? <div className="login-error">{errorMessage}</div> : null}

            <button className="login-submit" type="submit" disabled={submitting}>
              {submitting ? '登录中... / Signing In...' : '登录 / Sign In'}
            </button>
          </form>

          <div className="login-footnote">
            接口地址: `POST /api/v1/auth/login`
          </div>
        </section>
      </main>
    </div>
  )
}
