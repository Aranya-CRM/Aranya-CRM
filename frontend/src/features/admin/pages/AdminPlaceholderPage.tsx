import { useTranslation } from 'react-i18next'
import './adminDashboard.css'

interface AdminPlaceholderPageProps {
  titleKey: string
}

/** 后台预留分区(审计日志 / 组织设置)占位页 —— 功能后续接入。 */
export function AdminPlaceholderPage({ titleKey }: AdminPlaceholderPageProps) {
  const { t } = useTranslation()
  return (
    <div className="admin-placeholder">
      <h2>{t(titleKey)}</h2>
      <p>{t('admin.placeholder.desc')}</p>
      <span className="admin-placeholder-badge">{t('admin.comingSoon')}</span>
    </div>
  )
}
