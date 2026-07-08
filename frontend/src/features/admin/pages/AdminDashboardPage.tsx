import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AccountManagementSection } from '../components/AccountManagementSection'
import './adminDashboard.css'

type SectionId = 'accounts' | 'audit' | 'settings'

interface SectionDef {
  id: SectionId
  labelKey: string
  ready: boolean
}

const SECTIONS: SectionDef[] = [
  { id: 'accounts', labelKey: 'admin.nav.accounts', ready: true },
  { id: 'audit', labelKey: 'admin.nav.audit', ready: false },
  { id: 'settings', labelKey: 'admin.nav.settings', ready: false },
]

/** 管理控制台外壳:左侧分区导航 + 右侧内容区。目前仅「账号管理」可用,其余为预留分区。 */
export function AdminDashboardPage() {
  const { t } = useTranslation()
  const [active, setActive] = useState<SectionId>('accounts')

  return (
    <div className="admin-dashboard">
      <aside className="admin-dashboard-nav" aria-label={t('admin.title')}>
        <div className="admin-dashboard-brand">
          <h1>{t('admin.title')}</h1>
          <p>{t('admin.subtitle')}</p>
        </div>
        <nav>
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              className={'admin-nav-item' + (active === section.id ? ' active' : '') + (section.ready ? '' : ' disabled')}
              disabled={!section.ready}
              onClick={() => section.ready && setActive(section.id)}
            >
              <span>{t(section.labelKey)}</span>
              {section.ready ? null : <span className="admin-nav-soon">{t('admin.comingSoon')}</span>}
            </button>
          ))}
        </nav>
      </aside>

      <main className="admin-dashboard-content">
        {active === 'accounts' ? <AccountManagementSection /> : null}
      </main>
    </div>
  )
}
