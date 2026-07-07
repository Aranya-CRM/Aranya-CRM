import { useTranslation } from 'react-i18next'
import { updateMyLanguage } from '../../features/auth/api/user.api'
import { useAuth } from '../../contexts/AuthContext'

export function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const { authenticated } = useAuth()
  const isZh = i18n.language === 'zh'

  function toggle() {
    const next = isZh ? 'en' : 'zh'
    // 立即切换 UI(并经 languageChanged 写入 localStorage 兜底)
    void i18n.changeLanguage(next)
    // 已登录则把偏好写回账号,跨设备/浏览器生效;失败静默降级(本地仍已切换)
    if (authenticated) {
      void updateMyLanguage(next).catch(() => {})
    }
  }

  return (
    <button
      className="lang-switcher-btn"
      type="button"
      onClick={toggle}
      title={isZh ? 'Switch to English' : '切换为中文'}
    >
      {isZh ? 'EN' : '中'}
    </button>
  )
}
