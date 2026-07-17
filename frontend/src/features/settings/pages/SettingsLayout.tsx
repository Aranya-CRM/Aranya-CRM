import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { confirmLeave } from '../../../shared/navigation/unsavedGuard'
import { SETTINGS_PATH } from '../constants'
import { DEFAULT_SECTION_ID, SETTINGS_SECTIONS } from '../sections'
import './settings.css'

/** Settings 骨架:左侧分区导航 + 右侧内容区。分区由 SETTINGS_SECTIONS 注册表驱动,可深链接。 */
export function SettingsLayout() {
  const { t } = useTranslation()
  const { section } = useParams()
  const navigate = useNavigate()

  const active = SETTINGS_SECTIONS.find((s) => s.id === section)
  if (!active) {
    return <Navigate to={`${SETTINGS_PATH}/${DEFAULT_SECTION_ID}`} replace />
  }

  function handleNav(id: string) {
    if (id === active!.id) return
    if (!confirmLeave()) return
    navigate(`${SETTINGS_PATH}/${id}`)
  }

  return (
    <div className="settings-shell">
      <aside className="settings-side">
        <h1 className="settings-side-title">{t('settings.title')}</h1>
        <nav className="settings-side-nav" aria-label="Settings sections">
          {SETTINGS_SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`${SETTINGS_PATH}/${s.id}`}
              className={'settings-side-item' + (s.id === active.id ? ' active' : '')}
              aria-current={s.id === active.id ? 'page' : undefined}
              onClick={(event) => {
                event.preventDefault()
                handleNav(s.id)
              }}
            >
              {t(s.labelKey)}
            </a>
          ))}
        </nav>
      </aside>

      <section className="settings-body">{active.element}</section>
    </div>
  )
}
