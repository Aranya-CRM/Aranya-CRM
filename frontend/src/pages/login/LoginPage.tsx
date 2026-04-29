import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { AxiosError } from 'axios'
import {
  enableTwoFactorInit,
  isAuthenticated,
  login,
  setupTwoFactorInit,
  verifyTwoFactor,
} from '../../services/auth'
import './login.css'

function normalizeError(error: unknown, fallback: string): string {
  if (error instanceof AxiosError) {
    const message = error.response?.data?.message
    if (typeof message === 'string' && message.trim()) {
      return `${message} / Request failed.`
    }
  }
  return fallback
}

type LoginStep = 'credentials' | 'totp' | 'setup' | 'backup-codes'

export function LoginPage() {
  const navigate = useNavigate()

  const [step, setStep] = useState<LoginStep>('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [tempToken, setTempToken] = useState('')

  // 2FA verify
  const [totpCode, setTotpCode] = useState('')

  // 2FA setup
  const [setupSecret, setSetupSecret] = useState('')
  const [setupQrBase64, setSetupQrBase64] = useState('')
  const [setupCode, setSetupCode] = useState('')
  const [copied, setCopied] = useState(false)

  // backup codes
  const [backupCodes, setBackupCodes] = useState<string[]>([])

  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>()

  if (isAuthenticated()) {
    return <Navigate to="/dashboard" replace />
  }

  async function handleCredentialsSubmit(event: FormEvent<HTMLFormElement>) {
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

      navigate('/dashboard', { replace: true })
    } catch (error) {
      setErrorMessage(normalizeError(error, '登录失败，请检查邮箱和密码后重试。 / Unable to sign in. Please check your email and password.'))
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
              <span className="login-side-item-zh">首次登录需绑定两步验证（TOTP）</span>
              <span className="login-side-item-en">First-time login requires binding two-factor authentication (TOTP).</span>
            </li>
            <li>
              <span className="login-side-item-zh">请妥善保存备用码，丢失后无法找回</span>
              <span className="login-side-item-en">Keep your backup codes safe — they cannot be recovered if lost.</span>
            </li>
          </ul>
        </div>
      </aside>

      <main className="login-main">

        {/* ── Step 1: 账号密码 ── */}
        {step === 'credentials' && (
          <section className="login-card" aria-label="Login Form">
            <h2 className="login-title">登录</h2>
            <div className="login-subtitle">Login</div>
            <div className="login-copy-zh">请输入邮箱和密码，系统将向后端认证接口发起登录请求。</div>
            <div className="login-copy-en">
              Enter your credentials and the page will submit them to the backend auth endpoint.
            </div>

            <form className="login-form" onSubmit={handleCredentialsSubmit}>
              <label className="login-field">
                <span className="login-label-zh">邮箱</span>
                <span className="login-label-en">Email</span>
                <input
                  className="login-input"
                  type="email"
                  autoComplete="username"
                  placeholder="name@example.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                />
              </label>

              {errorMessage && <div className="login-error">{errorMessage}</div>}

              <button className="login-submit" type="submit" disabled={submitting}>
                {submitting ? '登录中... / Signing In...' : '登录 / Sign In'}
              </button>
            </form>

            <div className="login-footnote">接口地址: `POST /api/v1/auth/login`</div>
          </section>
        )}

        {/* ── Step 2a: 现有 2FA 验证码 ── */}
        {step === 'totp' && (
          <section className="login-card" aria-label="Two-Factor Verification Form">
            <h2 className="login-title">两步验证</h2>
            <div className="login-subtitle">Two-Factor Authentication</div>
            <div className="login-copy-zh">
              请打开您的验证器 App，输入当前的 6 位动态验证码；也可以使用备用码。
            </div>
            <div className="login-copy-en">
              Open your authenticator app and enter the 6-digit code, or use a backup code.
            </div>

            <form className="login-form" onSubmit={handleTotpSubmit}>
              <label className="login-field">
                <span className="login-label-zh">验证码</span>
                <span className="login-label-en">Verification Code</span>
                <input
                  className="login-input login-input-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  maxLength={8}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\s/g, ''))}
                  autoFocus
                  required
                />
              </label>

              {errorMessage && <div className="login-error">{errorMessage}</div>}

              <button className="login-submit" type="submit" disabled={submitting}>
                {submitting ? '验证中... / Verifying...' : '验证 / Verify'}
              </button>

              <button className="login-back" type="button" onClick={handleBackToCredentials} disabled={submitting}>
                ← 返回重新登录 / Back to sign-in
              </button>
            </form>

            <div className="login-footnote">接口地址: `POST /api/v1/auth/2fa/verify`</div>
          </section>
        )}

        {/* ── Step 2b: 首次绑定 2FA ── */}
        {step === 'setup' && (
          <section className="login-card login-card-wide" aria-label="Two-Factor Setup Form">
            <h2 className="login-title">绑定两步验证</h2>
            <div className="login-subtitle">Set Up Two-Factor Authentication</div>
            <div className="login-copy-zh">
              系统要求所有账号开启两步验证。请将下方密钥添加到验证器 App（如 Google Authenticator 或 Authy），然后输入 App 中生成的 6 位验证码。
            </div>
            <div className="login-copy-en">
              Two-factor authentication is required for all accounts. Add the key below to your authenticator app (e.g. Google Authenticator or Authy), then enter the 6-digit code it generates.
            </div>

            {setupQrBase64 && (
              <div className="login-setup-qr-wrap">
                <img
                  className="login-setup-qr"
                  src={`data:image/png;base64,${setupQrBase64}`}
                  alt="Scan with your authenticator app"
                />
                <div className="login-setup-qr-hint-zh">用验证器 App 扫描此二维码</div>
                <div className="login-setup-qr-hint-en">Scan with your authenticator app</div>
              </div>
            )}

            <div className="login-setup-block">
              <div className="login-setup-label-zh">或手动输入密钥</div>
              <div className="login-setup-label-en">Or enter the key manually</div>
              <div className="login-setup-secret-row">
                <code className="login-setup-secret">{setupSecret}</code>
                <button className="login-setup-copy" type="button" onClick={handleCopySecret}>
                  {copied ? '已复制 / Copied' : '复制 / Copy'}
                </button>
              </div>
              <div className="login-setup-hint-zh">
                打开验证器 App → 添加账号 → 手动输入 → 粘贴上方密钥
              </div>
              <div className="login-setup-hint-en">
                Open authenticator app → Add account → Enter setup key → Paste the key above
              </div>
            </div>

            <form className="login-form" onSubmit={handleSetupSubmit}>
              <label className="login-field">
                <span className="login-label-zh">验证码</span>
                <span className="login-label-en">Verification Code from App</span>
                <input
                  className="login-input login-input-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  maxLength={6}
                  value={setupCode}
                  onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, ''))}
                  required
                />
              </label>

              {errorMessage && <div className="login-error">{errorMessage}</div>}

              <button className="login-submit" type="submit" disabled={submitting}>
                {submitting ? '绑定中... / Binding...' : '确认绑定 / Confirm'}
              </button>

              <button className="login-back" type="button" onClick={handleBackToCredentials} disabled={submitting}>
                ← 返回重新登录 / Back to sign-in
              </button>
            </form>

            <div className="login-footnote">接口地址: `POST /api/v1/auth/2fa/enable-init`</div>
          </section>
        )}

        {/* ── Step 3: 展示备用码 ── */}
        {step === 'backup-codes' && (
          <section className="login-card login-card-wide" aria-label="Backup Codes">
            <h2 className="login-title">保存备用码</h2>
            <div className="login-subtitle">Save Your Backup Codes</div>
            <div className="login-copy-zh">
              两步验证已成功绑定。以下是您的 8 个备用码，每个只能使用一次。请立即抄写或打印保存，关闭此页面后将无法再次查看。
            </div>
            <div className="login-copy-en">
              Two-factor authentication is now active. Below are your 8 backup codes — each can only be used once. Copy or print them now; they will not be shown again.
            </div>

            <div className="login-backup-grid">
              {backupCodes.map((code) => (
                <code key={code} className="login-backup-code">{code}</code>
              ))}
            </div>

            <button
              className="login-submit"
              type="button"
              onClick={() => navigate('/dashboard', { replace: true })}
            >
              已保存，进入系统 / I've saved these — Continue
            </button>
          </section>
        )}

      </main>
    </div>
  )
}
