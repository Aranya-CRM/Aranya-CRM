import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import zh from './locales/zh.json'
import en from './locales/en.json'

/**
 * 初始语言解析(账号偏好在登录后由 AuthContext 覆盖):
 * 1) 本地已保存的选择(localStorage) — 上次在本浏览器用过的语言
 * 2) 浏览器级兜底 — 英文浏览器默认英文,其余默认中文
 */
function resolveInitialLang(): 'zh' | 'en' {
  const saved = localStorage.getItem('lang')
  if (saved === 'zh' || saved === 'en') return saved
  return navigator.language?.toLowerCase().startsWith('en') ? 'en' : 'zh'
}

i18n.use(initReactI18next).init({
  resources: {
    zh: { translation: zh },
    en: { translation: en },
  },
  lng: resolveInitialLang(),
  fallbackLng: 'zh',
  interpolation: { escapeValue: false },
})

i18n.on('languageChanged', (lng) => localStorage.setItem('lang', lng))

export default i18n
