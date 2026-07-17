import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { GrantGroup } from '../grantGroups'

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const bs = new Set(b)
  return a.every((x) => bs.has(x))
}

interface Props {
  group: GrantGroup
  userId: number
  onDirtyChange: (groupId: string, dirty: boolean) => void
}

/** 通用授权卡片:自持某授权族对某用户的读取/脏值/保存/重置,与具体权限族解耦。 */
export function GrantGroupCard({ group, userId, onDirtyChange }: Props) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState<string[]>([])
  const [savedValues, setSavedValues] = useState<string[]>([])
  const [locked, setLocked] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string>()

  const lockedSet = new Set(locked)
  const dirty = !loading && !sameSet(selected, savedValues)
  const checkedCount = new Set([...selected, ...locked]).size

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setSaved(false)
    setError(undefined)
    group.fetch(userId)
      .then((state) => {
        if (cancelled) return
        setSelected(state.granted)
        setSavedValues(state.granted)
        setLocked(state.locked)
      })
      .catch(() => { if (!cancelled) setError(t('settings.loadAccessError')) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [group, userId, t])

  useEffect(() => {
    onDirtyChange(group.id, dirty)
  }, [dirty, group.id, onDirtyChange])

  // 卸载时清除本卡的脏标记,避免残留
  useEffect(() => () => onDirtyChange(group.id, false), [group.id, onDirtyChange])

  function toggle(value: string) {
    if (lockedSet.has(value)) return
    setSaved(false)
    setSelected((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value])
  }

  function handleReset() {
    setSelected(savedValues)
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    setError(undefined)
    try {
      const state = await group.save(userId, selected)
      setSelected(state.granted)
      setSavedValues(state.granted)
      setLocked(state.locked)
      setSaved(true)
    } catch {
      setError(t('settings.saveError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fa-group">
      <div className="fa-group-head">
        <div className="fa-group-heading">
          <h3>{t(group.titleKey)}</h3>
          <p>{t(group.subtitleKey)}</p>
        </div>
        {!loading ? (
          <span className="fa-count">{t('settings.selectedCount', { count: checkedCount })}</span>
        ) : null}
      </div>

      {error ? <div className="settings-error">{error}</div> : null}

      {loading ? (
        <p className="settings-loading">{t('common.loading')}</p>
      ) : (
        <>
          <div className="fa-rows" role="group" aria-label={t(group.titleKey)}>
            {group.options.map((option) => {
              const isLocked = lockedSet.has(option.value)
              const isChecked = isLocked || selected.includes(option.value)
              return (
                <label key={option.value} className={'fa-row' + (isLocked ? ' locked' : '')}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={isLocked}
                    onChange={() => toggle(option.value)}
                  />
                  <span className="fa-row-icon" aria-hidden="true">{option.icon}</span>
                  <span className="fa-row-text">
                    <span className="fa-row-title">{t(option.labelKey)}</span>
                    <span className="fa-row-desc">{t(option.descKey)}</span>
                  </span>
                  {isLocked ? <span className="fa-row-badge">{t('settings.grants.inherited')}</span> : null}
                </label>
              )
            })}
          </div>

          <footer className="fa-savebar">
            <span className="fa-savebar-note">
              {dirty ? t('settings.unsavedHint') : saved ? `✓ ${t('settings.saved')}` : ''}
            </span>
            <div className="fa-savebar-actions">
              <button className="btn-secondary" type="button" disabled={!dirty || saving} onClick={handleReset}>
                {t('settings.reset')}
              </button>
              <button className="btn-primary" type="button" disabled={!dirty || saving} onClick={() => void handleSave()}>
                {saving ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </footer>
        </>
      )}
    </div>
  )
}
