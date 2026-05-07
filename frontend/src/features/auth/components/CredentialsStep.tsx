import type { FormEventHandler } from 'react'

interface CredentialsStepProps {
  email: string
  password: string
  submitting: boolean
  noticeMessage?: string
  errorMessage?: string
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onPasswordSubmit: FormEventHandler<HTMLFormElement>
  onGoogleLogin: () => void
}

export function CredentialsStep({
  email,
  password,
  submitting,
  noticeMessage,
  errorMessage,
  onEmailChange,
  onPasswordChange,
  onPasswordSubmit,
  onGoogleLogin,
}: CredentialsStepProps) {
  return (
    <form className="login-form" onSubmit={onPasswordSubmit}>
      <label className="login-field">
        <span className="login-label-zh">邮箱</span>
        <span className="login-label-en">Email</span>
        <input
          className="login-input"
          type="email"
          autoComplete="username"
          placeholder="name@example.org"
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
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
          onChange={(event) => onPasswordChange(event.target.value)}
          minLength={6}
          required
        />
      </label>

      {noticeMessage ? <div className="login-notice">{noticeMessage}</div> : null}
      {errorMessage ? <div className="login-error">{errorMessage}</div> : null}

      <button className="login-submit" type="submit" disabled={submitting}>
        {submitting ? '登录中... / Signing In...' : '邮箱登录 / Sign In'}
      </button>
      <button className="login-secondary" type="button" onClick={onGoogleLogin} disabled={submitting}>
        使用 Google 登录 / Continue with Google
      </button>
    </form>
  )
}
