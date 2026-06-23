import { useTranslation } from 'react-i18next'

export interface EventDetail {
  id: string
  kind: 'OWN' | 'SHARED'
  title: string
  start?: string | null
  end?: string | null
  source: 'OWN_CASE' | 'OTHER_CASE' | 'EXTERNAL'
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
  localId?: number
}

interface Props {
  detail: EventDetail
  onClose: () => void
  onDelete?: (localId: number) => void
  deleting?: boolean
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
export function EventDetailModal({ detail, onClose, onDelete, deleting }: Props) {
  const { t } = useTranslation()

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
              {detail.source === 'OTHER_CASE' ? t('cases.services.sourceOtherCase') : t('cases.services.sourceExternal')}
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
            <div className="event-detail-raw">{detail.description.trim()}</div>
          ) : (
            <div className="event-detail-empty">{t('cases.services.noEventDetails')}</div>
          )}
        </div>

        <footer className="event-modal-footer">
          {detail.kind === 'OWN' && detail.localId != null && onDelete ? (
            <button
              className="btn-danger"
              type="button"
              disabled={deleting}
              onClick={() => onDelete(detail.localId!)}
            >
              {deleting ? t('common.saving') : t('common.delete')}
            </button>
          ) : null}
          <button className="btn-secondary" type="button" onClick={onClose}>
            {t('common.cancel')}
          </button>
        </footer>
      </div>
    </div>
  )
}
