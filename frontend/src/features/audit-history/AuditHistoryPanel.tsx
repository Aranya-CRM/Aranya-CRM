import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCaseAuditHistory } from './api'
import { auditCategoryForEntry, buildAuditTrail, filterAuditTrail, summarizeAuditTrail } from './auditHistoryUtils'
import type { AuditAction, AuditCategory, AuditTrailEntry } from './types'
import './auditHistory.css'

interface AuditHistoryPanelProps {
  caseId: string
  caseCode: string
}

const FILTERS: AuditCategory[] = ['all', 'case', 'service', 'member', 'file', 'report']

export function AuditHistoryPanel({ caseId, caseCode }: AuditHistoryPanelProps) {
  const { t } = useTranslation()
  const [filter, setFilter] = useState<AuditCategory>('all')
  const { data = [], isLoading, isError } = useCaseAuditHistory(caseId)
  const entries = useMemo(() => buildAuditTrail(data, { targetType: 'CASE', targetId: caseId }), [caseId, data])
  const visibleEntries = useMemo(() => filterAuditTrail(entries, filter), [entries, filter])
  const summary = useMemo(() => summarizeAuditTrail(entries), [entries])

  return (
    <section className="audit-history-panel">
      <header className="audit-history-toolbar">
        <div>
          <h2>{t('auditHistory.title')}</h2>
          <p>{t('auditHistory.subtitle', { caseCode })}</p>
        </div>
        <div className="audit-history-controls">
          <span className="audit-history-lock">{t('auditHistory.readonly')}</span>
          <label>
            <span>{t('auditHistory.filter.label')}</span>
            <select value={filter} onChange={(event) => setFilter(event.target.value as AuditCategory)}>
              {FILTERS.map((item) => (
                <option key={item} value={item}>
                  {t(`auditHistory.filter.${item}`)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <div className="audit-history-stat-row">
        <Stat label={t('auditHistory.stats.total')} value={summary.totalEvents} />
        <Stat label={t('auditHistory.stats.pending')} value={summary.pendingApprovals} />
        <Stat label={t('auditHistory.stats.approved')} value={summary.approvedApprovals} />
        <Stat label={t('auditHistory.stats.rejected')} value={summary.rejectedApprovals} />
      </div>

      <div className="audit-history-list" role="list" aria-label={t('auditHistory.listLabel')}>
        {isLoading ? (
          <p className="audit-history-state">{t('auditHistory.loading')}</p>
        ) : isError ? (
          <p className="audit-history-state error">{t('auditHistory.loadError')}</p>
        ) : visibleEntries.length === 0 ? (
          <p className="audit-history-state">{t('auditHistory.empty')}</p>
        ) : visibleEntries.map((entry) => (
          <AuditEntryRow key={entry.id} entry={entry} />
        ))}
      </div>
    </section>
  )
}

function AuditEntryRow({ entry }: { entry: AuditTrailEntry }) {
  const { t } = useTranslation()
  const category = auditCategoryForEntry(entry)
  const content = approvalContent(entry, t)
  const requester = entry.requestedByName || '-'
  const approver = entry.decidedByName || '-'

  return (
    <details className="audit-history-row" role="listitem">
      <summary>
        <time className="audit-history-time" dateTime={entry.occurredAt}>
          <span>{formatDate(entry.occurredAt)}</span>
          <strong>{formatTime(entry.occurredAt)}</strong>
        </time>
        <div className="audit-history-main">
          <div className="audit-history-badges">
            <span className={`audit-history-category category-${category}`}>{t(`auditHistory.filter.${category}`)}</span>
            <span className={`audit-history-status status-${entry.decisionStatus}`}>{t(`auditHistory.status.${entry.decisionStatus}`)}</span>
          </div>
          <strong>{t(`auditHistory.action.${entry.action}`, { defaultValue: entry.action })}</strong>
          <p>{content}</p>
        </div>
        <div className="audit-history-people">
          <span>{t('auditHistory.fields.requestedBy')}: {requester}</span>
          <span>{t(deleteApprovalAction(entry.action) ? 'auditHistory.fields.deleteApprovedBy' : 'auditHistory.fields.approvedBy')}: {approver}</span>
        </div>
      </summary>

      <dl className="audit-history-detail">
        <Field label={t('auditHistory.fields.target')} value={entry.targetLabel} />
        <Field label={t(actorLabelKey(entry.action))} value={entry.actorName || '-'} />
        <Field label={t('auditHistory.fields.requestedAt')} value={formatDateTime(entry.requestedAt)} />
        <Field label={t('auditHistory.fields.decidedAt')} value={formatDateTime(entry.decidedAt)} />
        <Field label={t('auditHistory.fields.approvalId')} value={entry.approvalRequestId || '-'} />
        <Field label={t('auditHistory.fields.reason')} value={entry.reason || '-'} wide />
      </dl>
    </details>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="audit-history-stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

function Field({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? 'wide' : ''}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

function approvalContent(entry: AuditTrailEntry, t: (key: string, options?: Record<string, unknown>) => string): string {
  if (entry.action === 'CASE_SERVICE_UPDATE') {
    const add = serviceNames(entry.metadata?.addServiceKeys, t)
    const remove = serviceNames(entry.metadata?.removeServiceKeys, t)
    if (add && remove) return t('auditHistory.content.serviceAddRemove', { add, remove })
    if (add) return t('auditHistory.content.serviceAdd', { add })
    if (remove) return t('auditHistory.content.serviceRemove', { remove })
    return t('auditHistory.content.serviceUpdate')
  }

  if (entry.action === 'SENSITIVE_FILE_ARCHIVE') {
    return t('auditHistory.content.fileArchive', { target: fileTarget(entry) })
  }
  if (entry.action === 'SENSITIVE_FILE_SUPERSEDE') {
    return t('auditHistory.content.fileSupersede', { target: fileTarget(entry) })
  }
  if (entry.action === 'SENSITIVE_FILE_RESTORE') {
    return t('auditHistory.content.fileRestore', { target: fileTarget(entry) })
  }

  return t(`auditHistory.content.${entry.action}`, { target: entry.targetLabel, defaultValue: entry.summary })
}

function serviceNames(value: string | undefined, t: (key: string, options?: Record<string, unknown>) => string): string {
  if (!value) return ''
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((key) => t(`cases.service.${key}`, { defaultValue: key }))
    .join(', ')
}

function fileTarget(entry: AuditTrailEntry): string {
  return entry.metadata?.fileName || entry.metadata?.documentName || entry.targetLabel
}

function actorLabelKey(action: AuditAction): string {
  if (action === 'DELETE_CASE' || action === 'DELETE_CLIENT' || action === 'DELETE_REPORT' || action === 'SENSITIVE_FILE_ARCHIVE') {
    return 'auditHistory.fields.archivedBy'
  }
  if (action === 'RESTORE_CASE' || action === 'RESTORE_CLIENT' || action === 'SENSITIVE_FILE_RESTORE') return 'auditHistory.fields.restoredBy'
  if (action === 'CLIENT_UPDATE' || action === 'CASE_SERVICE_UPDATE' || action === 'SENSITIVE_FILE_SUPERSEDE') {
    return 'auditHistory.fields.modifiedBy'
  }
  return 'auditHistory.fields.createdBy'
}

function deleteApprovalAction(action: AuditAction): boolean {
  return action === 'DELETE_CASE' || action === 'DELETE_CLIENT' || action === 'DELETE_REPORT' || action === 'SENSITIVE_FILE_ARCHIVE'
}

function formatDate(value: string | undefined): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value.slice(0, 10)
  return date.toISOString().slice(0, 10)
}

function formatTime(value: string | undefined): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Singapore' })
}

function formatDateTime(value: string | undefined): string {
  if (!value) return '-'
  return `${formatDate(value)} ${formatTime(value)}`
}
