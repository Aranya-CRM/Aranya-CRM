import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import DOMPurify from 'dompurify'

/** 裁掉「< ===== do not cut & paste … 」页脚,识别 HTML/纯文本后净化,供安全渲染。 */
function cleanDescriptionHtml(raw: string): string {
  let s = raw.replace(/(&lt;|<)\s*=+\s*do not cut[\s\S]*$/i, '').trim()
  // 纯文本(无标签)时把换行转成 <br>,避免挤成一行
  if (!/<[a-z][\s\S]*>/i.test(s)) {
    s = s.replace(/\n/g, '<br>')
  }
  return DOMPurify.sanitize(s, {
    ALLOWED_TAGS: ['b', 'strong', 'u', 'i', 'em', 'br', 'p', 'ul', 'ol', 'li', 'a', 'span', 'div'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  })
}

export interface EventDetail {
  id: string
  kind: 'OWN' | 'SHARED'
  title: string
  start?: string | null
  end?: string | null
  source: 'OWN_CASE' | 'OTHER_CASE' | 'EXTERNAL' | 'PERSONAL'
  serviceName?: string | null
  assignedUserName?: string | null
  location?: string | null
  agenda?: string | null
  schedule?: string | null
  address?: string | null
  manpower?: string | null
  instructions?: string | null
  reportDueAt?: string | null
  description?: string | null
  calendarName?: string | null
  localId?: number
  synced?: boolean
}

interface Props {
  detail: EventDetail
  onClose: () => void
  onEdit?: (localId: number) => void
  onDelete?: (localId: number) => void
  onSync?: (localId: number) => void
  deleting?: boolean
  syncing?: boolean
  /** Google 集成是否启用(关闭时不展示未同步告警) */
  syncEnabled?: boolean
}

function fmt(value?: string | null): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString(undefined, {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  })
}

function timeRange(start?: string | null, end?: string | null): string {
  if (!start) return ''
  return end ? `${fmt(start)} – ${fmt(end)}` : fmt(start)
}

/** 像 Google Calendar 那样,点击事件后展示的详情卡片弹窗。 */
export function EventDetailModal({ detail, onClose, onEdit, onDelete, onSync, deleting, syncing, syncEnabled }: Props) {
  const { t } = useTranslation()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const isOwn = detail.kind === 'OWN' && detail.localId != null
  const showUnsynced = isOwn && syncEnabled && detail.synced === false

  const sections: Array<[string, string | null | undefined]> = [
    [t('cases.services.agenda'), detail.agenda],
    [t('cases.services.schedule'), detail.schedule],
    [t('cases.services.address'), detail.address],
    [t('cases.services.manpower'), detail.manpower],
    [t('cases.services.instructions'), detail.instructions],
  ]
  const hasStructured = sections.some(([, v]) => v && v.trim())

  return (
    <div className="event-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="event-modal event-detail-modal" onMouseDown={(e) => e.stopPropagation()}>
        <header className="event-modal-header">
          <h2>{detail.title}</h2>
          <button type="button" className="event-modal-close" aria-label="Close" onClick={onClose}>×</button>
        </header>

        <div className="event-modal-body">
          {timeRange(detail.start, detail.end) ? (
            <div className="event-detail-time">{timeRange(detail.start, detail.end)}</div>
          ) : null}

          {detail.source !== 'OWN_CASE' ? (
            <div className="event-detail-source">
              {detail.source === 'OTHER_CASE'
                ? t('cases.services.sourceOtherCase')
                : detail.source === 'PERSONAL'
                  ? t('cases.services.sourcePersonal')
                  : t('cases.services.sourceExternal')}
              {detail.calendarName ? ` · ${detail.calendarName}` : ''}
            </div>
          ) : null}

          {showUnsynced ? (
            <div className="event-detail-unsynced">
              <span>{t('cases.services.notSynced')}</span>
              {onSync ? (
                <button type="button" className="btn-link-action" disabled={syncing} onClick={() => onSync(detail.localId!)}>
                  {syncing ? t('common.saving') : t('cases.services.retrySync')}
                </button>
              ) : null}
            </div>
          ) : null}

          {detail.assignedUserName ? (
            <div className="event-detail-section">
              <div className="event-detail-label">{t('cases.services.participants')}</div>
              <div className="event-detail-content">{detail.assignedUserName}</div>
            </div>
          ) : null}

          {detail.kind === 'OWN' && hasStructured ? (
            <div className="event-detail-sections">
              {sections.map(([label, value]) =>
                value && value.trim() ? (
                  <div className="event-detail-section" key={label}>
                    <div className="event-detail-label">*{label}*</div>
                    <div className="event-detail-content">{value.trim()}</div>
                  </div>
                ) : null,
              )}
            </div>
          ) : detail.description && detail.description.trim() ? (
            <div
              className="event-detail-raw"
              dangerouslySetInnerHTML={{ __html: cleanDescriptionHtml(detail.description) }}
            />
          ) : (
            <div className="event-detail-empty">{t('cases.services.noEventDetails')}</div>
          )}
        </div>

        <footer className="event-modal-footer">
          {isOwn && onEdit ? (
            <button className="btn-edit" type="button" disabled={deleting} onClick={() => onEdit(detail.localId!)}>
              {t('common.edit')}
            </button>
          ) : null}
          {isOwn && onDelete ? (
            confirmDelete ? (
              <span className="event-detail-confirm">
                <span>{t('cases.services.confirmDelete')}</span>
                <button className="btn-danger" type="button" disabled={deleting} onClick={() => onDelete(detail.localId!)}>
                  {deleting ? t('common.saving') : t('common.confirm')}
                </button>
                <button className="btn-secondary" type="button" disabled={deleting} onClick={() => setConfirmDelete(false)}>
                  {t('common.cancel')}
                </button>
              </span>
            ) : (
              <button className="btn-danger" type="button" disabled={deleting} onClick={() => setConfirmDelete(true)}>
                {t('common.delete')}
              </button>
            )
          ) : null}
          {!confirmDelete ? (
            <button className="btn-secondary" type="button" onClick={onClose}>
              {t('common.close')}
            </button>
          ) : null}
        </footer>
      </div>
    </div>
  )
}
