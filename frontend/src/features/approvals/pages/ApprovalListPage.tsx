import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ErrorBanner, PageHeader } from '../../../shared/ui'
import { useApproveRequest, usePendingApprovals, useRejectRequest } from '../api/approval.api'
import './approvals.css'

type ParsedPayload = Record<string, unknown>

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function parsePayload(value: string | null | undefined): ParsedPayload {
  if (!value) return {}
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as ParsedPayload : {}
  } catch {
    return {}
  }
}

function stringifyValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '-'
  if (Array.isArray(value)) return value.map(stringifyValue).join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function payloadRows(payload: ParsedPayload): Array<[string, string]> {
  return Object.entries(payload)
    .filter(([key]) => key !== '_approval')
    .map(([key, value]) => [key, stringifyValue(value)])
}

function targetHref(targetType: string | null | undefined, targetId: number | null | undefined): string | undefined {
  if (targetType === 'CLIENT') return targetId == null ? '/clients' : `/clients/${targetId}`
  if (targetType === 'CASE') return targetId == null ? '/cases' : `/cases/${targetId}`
  if (targetType === 'REPORT') return targetId == null ? '/reports' : `/reports/${targetId}`
  return undefined
}

function targetLabel(item: { targetType?: string | null; targetId?: number | null; targetLabel?: string | null }): string {
  if (item.targetLabel) return item.targetLabel
  if (item.targetType === 'REPORT' && item.targetId != null) return `RPT-${item.targetId}`
  if (item.targetType && item.targetId != null) return `${item.targetType} ${item.targetId}`
  return '-'
}

export function ApprovalListPage() {
  const { t } = useTranslation()
  const { data = [], isLoading, isError } = usePendingApprovals()
  const approveRequest = useApproveRequest()
  const rejectRequest = useRejectRequest()
  const [selectedId, setSelectedId] = useState<number>()
  const [comment, setComment] = useState('')
  const [actionError, setActionError] = useState<string>()

  const selected = useMemo(() => {
    if (data.length === 0) return undefined
    return data.find((item) => item.id === selectedId) ?? data[0]
  }, [data, selectedId])

  const selectedPayload = useMemo(() => parsePayload(selected?.payloadJson), [selected])
  const selectedPayloadRows = useMemo(() => payloadRows(selectedPayload), [selectedPayload])
  const selectedTargetHref = targetHref(selected?.targetType, selected?.targetId)
  const isMutating = approveRequest.isPending || rejectRequest.isPending

  async function decide(decision: 'approve' | 'reject') {
    if (!selected) return
    setActionError(undefined)
    try {
      if (decision === 'approve') {
        await approveRequest.mutateAsync({ id: selected.id, data: { comment: comment.trim() || undefined } })
      } else {
        await rejectRequest.mutateAsync({ id: selected.id, data: { comment: comment.trim() || undefined } })
      }
      setComment('')
      setSelectedId(undefined)
    } catch {
      setActionError(t('approvals.actionError'))
    }
  }

  return (
    <div className="approval-page">
      <PageHeader
        title={t('approvals.title')}
        subtitle={t('approvals.subtitle')}
      />

      {isError ? <ErrorBanner message={t('approvals.loadError')} /> : null}
      {actionError ? <ErrorBanner message={actionError} /> : null}

      <div className="approval-layout">
        <aside className="approval-list" aria-label={t('approvals.listLabel')}>
          <div className="approval-list-head">
            <span>{t('approvals.pending')}</span>
            <strong>{data.length}</strong>
          </div>

          {isLoading ? (
            <div className="approval-state">{t('common.loading')}</div>
          ) : data.length === 0 ? (
            <div className="approval-state">{t('approvals.empty')}</div>
          ) : (
            data.map((item) => (
              <button
                key={item.id}
                type="button"
                className={'approval-item' + (selected?.id === item.id ? ' active' : '')}
                onClick={() => {
                  setSelectedId(item.id)
                  setComment('')
                  setActionError(undefined)
                }}
              >
                <span className="approval-item-type">{t(`approvals.type.${item.type}`, { defaultValue: item.type })}</span>
                <span className="approval-item-meta">{item.requestedByName ?? '-'} · {formatDateTime(item.createdAt)}</span>
                <span className="approval-item-target">{targetLabel(item)}</span>
              </button>
            ))
          )}
        </aside>

        <main className="approval-detail" aria-label={t('approvals.detailLabel')}>
          {!selected ? (
            <div className="approval-state">{t('approvals.selectPrompt')}</div>
          ) : (
            <>
              <div className="approval-detail-head">
                <div>
                  <span className="approval-status">{selected.status}</span>
                  <h2>{t(`approvals.type.${selected.type}`, { defaultValue: selected.type })}</h2>
                </div>
                <div className="approval-id">#{selected.id}</div>
              </div>

              <div className="approval-meta-grid">
                <InfoCell label={t('approvals.fields.requestedBy')} value={selected.requestedByName ?? '-'} />
                <InfoCell label={t('approvals.fields.createdAt')} value={formatDateTime(selected.createdAt)} />
                <InfoCell label={t('approvals.fields.target')} value={targetLabel(selected)} />
                <InfoCell label={t('approvals.fields.status')} value={selected.status} />
              </div>
              {selectedTargetHref ? (
                <Link className="approval-target-link" to={selectedTargetHref}>
                  {t('approvals.openTarget')}
                </Link>
              ) : null}

              <section className="approval-payload">
                <h3>{t('approvals.payload')}</h3>
                {selectedPayloadRows.length === 0 ? (
                  <div className="approval-state compact">{t('approvals.noPayload')}</div>
                ) : (
                  <div className="approval-payload-grid">
                    {selectedPayloadRows.map(([key, value]) => (
                      <div className="approval-payload-row" key={key}>
                        <span>{key}</span>
                        <p>{value}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <label className="approval-comment">
                <span>{t('approvals.comment')}</span>
                <textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder={t('approvals.commentPlaceholder')}
                />
              </label>

              <div className="approval-actions">
                <button
                  className="btn-secondary"
                  type="button"
                  disabled={isMutating}
                  onClick={() => void decide('reject')}
                >
                  {rejectRequest.isPending ? t('common.saving') : t('approvals.reject')}
                </button>
                <button
                  className="btn-primary"
                  type="button"
                  disabled={isMutating}
                  onClick={() => void decide('approve')}
                >
                  {approveRequest.isPending ? t('common.saving') : t('approvals.approve')}
                </button>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="approval-info-cell">
      <span>{label}</span>
      <p>{value}</p>
    </div>
  )
}
