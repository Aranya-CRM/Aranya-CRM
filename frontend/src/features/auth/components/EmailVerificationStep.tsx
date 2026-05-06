interface EmailVerificationStepProps {
  email: string
  submitting: boolean
  noticeMessage?: string
  errorMessage?: string
  onSendVerificationEmail: () => void
  onBack: () => void
}

export function EmailVerificationStep({
  email,
  submitting,
  noticeMessage,
  errorMessage,
  onSendVerificationEmail,
  onBack,
}: EmailVerificationStepProps) {
  return (
    <div className="login-form">
      <div className="login-copy-zh">请先验证邮箱：{email}</div>
      <div className="login-copy-en">Verify your email address before continuing.</div>
      {noticeMessage ? <div className="login-notice">{noticeMessage}</div> : null}
      {errorMessage ? <div className="login-error">{errorMessage}</div> : null}
      <button className="login-submit" type="button" onClick={onSendVerificationEmail} disabled={submitting}>
        {submitting ? '发送中... / Sending...' : '发送验证邮件 / Send Verification Email'}
      </button>
      <button className="login-back" type="button" onClick={onBack} disabled={submitting}>
        返回登录 / Back to Sign In
      </button>
    </div>
  )
}
