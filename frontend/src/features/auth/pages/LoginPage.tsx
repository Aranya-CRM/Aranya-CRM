import { Navigate } from 'react-router-dom'
import {
  CredentialsStep,
  EmailVerificationStep,
  TotpChallengeStep,
  TotpEnrollmentStep,
} from '../components'
import { useFirebaseLoginFlow } from '../hooks'
import { useAuth } from '../../../contexts/AuthContext'
import { getDefaultRoute } from '../../../shared/auth/defaultRoute'
import './login.css'

export function LoginPage() {
  const loginFlow = useFirebaseLoginFlow()
  const { manifest } = useAuth()

  if (loginFlow.authenticated) {
    return <Navigate to={getDefaultRoute(manifest)} replace />
  }

  function renderStep() {
    if (loginFlow.step === 'email-verification') {
      return (
        <EmailVerificationStep
          email={loginFlow.verificationEmail}
          submitting={loginFlow.submitting}
          noticeMessage={loginFlow.noticeMessage}
          errorMessage={loginFlow.errorMessage}
          onSendVerificationEmail={loginFlow.handleSendVerificationEmail}
          onBack={loginFlow.resetLoginState}
        />
      )
    }

    if (loginFlow.step === 'totp-challenge') {
      return (
        <TotpChallengeStep
          code={loginFlow.totpCode}
          submitting={loginFlow.submitting}
          errorMessage={loginFlow.errorMessage}
          onCodeChange={loginFlow.setTotpCode}
          onSubmit={loginFlow.handleTotpChallenge}
          onBack={loginFlow.resetLoginState}
        />
      )
    }

    if (loginFlow.step === 'totp-enrollment') {
      return (
        <TotpEnrollmentStep
          setupCode={loginFlow.setupCode}
          secretKey={loginFlow.totpSecretKey}
          qrDataUrl={loginFlow.totpQrDataUrl}
          submitting={loginFlow.submitting}
          errorMessage={loginFlow.errorMessage}
          onSetupCodeChange={loginFlow.setSetupCode}
          onSubmit={loginFlow.handleTotpEnrollment}
          onBack={loginFlow.resetLoginState}
        />
      )
    }

    return (
      <CredentialsStep
        email={loginFlow.email}
        password={loginFlow.password}
        submitting={loginFlow.submitting}
        noticeMessage={loginFlow.noticeMessage}
        errorMessage={loginFlow.errorMessage}
        onEmailChange={loginFlow.setEmail}
        onPasswordChange={loginFlow.setPassword}
        onPasswordSubmit={loginFlow.handlePasswordLogin}
        onGoogleLogin={loginFlow.handleGoogleLogin}
      />
    )
  }

  return (
    <div className="login-page">
      <aside className="login-aside">
        <div className="login-brand">
          <h1 className="login-brand-title">阿兰若个案管理系统</h1>
          <div className="login-brand-subtitle">Aranya CRM</div>
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
        </section>
      </main>
    </div>
  )
}
