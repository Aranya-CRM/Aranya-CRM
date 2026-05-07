import type { FormEventHandler } from 'react'

interface TotpChallengeStepProps {
  code: string
  submitting: boolean
  errorMessage?: string
  onCodeChange: (value: string) => void
  onSubmit: FormEventHandler<HTMLFormElement>
  onBack: () => void
}

export function TotpChallengeStep({
  code,
  submitting,
  errorMessage,
  onCodeChange,
  onSubmit,
  onBack,
}: TotpChallengeStepProps) {
  return (
    <form className="login-form" onSubmit={onSubmit}>
      <label className="login-field">
        <span className="login-label-zh">认证器验证码</span>
        <span className="login-label-en">Authenticator Code</span>
        <input
          className="login-input login-input-code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(event) => onCodeChange(event.target.value)}
          required
        />
      </label>
      {errorMessage ? <div className="login-error">{errorMessage}</div> : null}
      <button className="login-submit" type="submit" disabled={submitting}>
        {submitting ? '验证中... / Verifying...' : '验证并进入 / Verify'}
      </button>
      <button className="login-back" type="button" onClick={onBack} disabled={submitting}>
        返回登录 / Back to Sign In
      </button>
    </form>
  )
}
