import type { FormEventHandler } from 'react'

interface TotpEnrollmentStepProps {
  setupCode: string
  secretKey: string
  qrDataUrl: string
  submitting: boolean
  errorMessage?: string
  onSetupCodeChange: (value: string) => void
  onSubmit: FormEventHandler<HTMLFormElement>
  onBack: () => void
}

export function TotpEnrollmentStep({
  setupCode,
  secretKey,
  qrDataUrl,
  submitting,
  errorMessage,
  onSetupCodeChange,
  onSubmit,
  onBack,
}: TotpEnrollmentStepProps) {
  return (
    <form className="login-form" onSubmit={onSubmit}>
      <div className="login-setup-block">
        <div className="login-setup-label-zh">绑定认证器</div>
        <div className="login-setup-label-en">Link an authenticator app</div>
        <div className="login-setup-hint-zh">在认证器 App 中扫描二维码或手动添加密钥，然后输入 6 位验证码。</div>
        <div className="login-setup-hint-en">Scan the QR code or add this secret manually, then enter the 6-digit code.</div>
        {qrDataUrl ? (
          <div className="login-setup-qr-wrap">
            <img className="login-setup-qr" src={qrDataUrl} alt="Authenticator QR code" />
            <div className="login-setup-qr-hint-zh">使用认证器 App 扫描二维码</div>
            <div className="login-setup-qr-hint-en">Scan this QR code with your authenticator app.</div>
          </div>
        ) : null}
        <div className="login-setup-secret-row">
          <div className="login-setup-secret">{secretKey}</div>
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
          onChange={(event) => onSetupCodeChange(event.target.value)}
          required
        />
      </label>
      {errorMessage ? <div className="login-error">{errorMessage}</div> : null}
      <button className="login-submit" type="submit" disabled={submitting}>
        {submitting ? '绑定中... / Linking...' : '绑定认证器 / Link Authenticator'}
      </button>
      <button className="login-back" type="button" onClick={onBack} disabled={submitting}>
        返回登录 / Back to Sign In
      </button>
    </form>
  )
}
