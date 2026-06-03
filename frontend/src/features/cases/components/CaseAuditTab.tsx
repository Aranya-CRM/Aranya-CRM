import { useTranslation } from 'react-i18next'
import type { AuditLogAction, AuditLogEntry, Case, CaseFlag, CaseNote } from '../types'

interface CaseAuditTabProps {
  caseData: Case
  notes: CaseNote[]
  auditLog: AuditLogEntry[]
  flags: CaseFlag[]
}

interface ComplianceItem {
  id: string
  passed: boolean
  failNoteKey?: string
}

function computeCompliance(caseData: Case, notes: CaseNote[]): ComplianceItem[] {
  const openDate = new Date(caseData.dateOpened)
  const hasNoteWithin7Days = notes.some((n) => {
    const diff = new Date(n.date).getTime() - openDate.getTime()
    return diff >= 0 && diff <= 7 * 86_400_000
  })
  const isRed = caseData.colorCode === 'RED'

  return [
    {
      id: 'sw_assigned',
      passed: Boolean(caseData.socialWorker),
    },
    {
      id: 'volunteer_assigned',
      passed: Boolean(caseData.assignedVolunteer),
      failNoteKey: 'cases.audit.compliance.volunteer_assigned_fail',
    },
    {
      id: 'early_note',
      passed: hasNoteWithin7Days,
      failNoteKey: 'cases.audit.compliance.early_note_fail',
    },
    {
      id: 'has_notes',
      passed: notes.length > 0,
    },
    {
      id: 'tasks_defined',
      passed: Boolean(caseData.tasks && caseData.tasks.length > 0),
      failNoteKey: 'cases.audit.compliance.tasks_defined_fail',
    },
    {
      id: 'crisis_for_red',
      passed: !isRed || caseData.services.volunteerVisit,
      failNoteKey: 'cases.audit.compliance.crisis_for_red_fail',
    },
    {
      id: 'status_ok',
      passed: caseData.status !== 'SUSPENDED' || notes.length > 0,
    },
  ]
}

const ACTION_COLOR_CLASS: Record<AuditLogAction, string> = {
  CASE_CREATED:        'audit-dot-green',
  CASE_CLOSED:         'audit-dot-grey',
  CASE_REOPENED:       'audit-dot-green',
  STATUS_CHANGED:      'audit-dot-orange',
  INTENSITY_CHANGED:   'audit-dot-red',
  NOTE_ADDED:          'audit-dot-blue',
  TASK_COMPLETED:      'audit-dot-green',
  TASK_ADDED:          'audit-dot-blue',
  CASEWORKER_ASSIGNED: 'audit-dot-grey',
  VOLUNTEER_ASSIGNED:  'audit-dot-grey',
  SERVICE_UPDATED:     'audit-dot-blue',
  CASE_FLAGGED:        'audit-dot-purple',
  FLAG_RESOLVED:       'audit-dot-green',
}

function formatAuditDateTime(iso: string): { date: string; time: string } {
  const d = new Date(iso)
  return {
    date: d.toISOString().slice(0, 10),
    time: d.toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Singapore' }),
  }
}

export function CaseAuditTab({ caseData, notes, auditLog, flags }: CaseAuditTabProps) {
  const { t } = useTranslation()
  const compliance = computeCompliance(caseData, notes)
  const passed = compliance.filter((c) => c.passed).length
  const total = compliance.length
  const scoreClass = passed >= total - 1 ? 'audit-score-good' : passed >= total - 3 ? 'audit-score-warn' : 'audit-score-fail'

  const openFlags = flags.filter((f) => f.status === 'OPEN')

  return (
    <div className="audit-tab">
      {/* ── Section 1: Compliance ── */}
      <section className="audit-section">
        <div className="audit-section-header">
          <div>
            <div className="audit-section-title">{t('cases.audit.compliance.title')}</div>
            <div className="audit-section-sub">{t('cases.audit.compliance.subtitle')}</div>
          </div>
          <span className={'audit-score-badge ' + scoreClass}>
            {t('cases.audit.compliance.passed', { count: passed, total })}
          </span>
        </div>
        <div className="audit-compliance-list">
          {compliance.map((item) => (
            <div key={item.id} className={'audit-compliance-item' + (item.passed ? '' : ' fail')}>
              <span className={'audit-compliance-icon' + (item.passed ? ' pass' : ' fail')}>
                {item.passed ? '✓' : '✗'}
              </span>
              <div className="audit-compliance-body">
                <span className="audit-compliance-label">
                  {t(`cases.audit.compliance.${item.id}`)}
                </span>
                {!item.passed && item.failNoteKey ? (
                  <span className="audit-compliance-note">{t(item.failNoteKey)}</span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Section 2: Flags ── */}
      <section className="audit-section">
        <div className="audit-section-header">
          <div>
            <div className="audit-section-title">{t('cases.audit.flags.title')}</div>
            <div className="audit-section-sub">
              {openFlags.length > 0
                ? t('cases.audit.flags.open', { count: openFlags.length })
                : t('cases.audit.flags.noOpen')}
            </div>
          </div>
          <button
            className="btn-audit btn-compact"
            type="button"
            onClick={() => alert(t('common.comingSoon'))}
          >
            ⚑ {t('cases.audit.flags.flagCase')}
          </button>
        </div>

        {flags.length === 0 ? (
          <p className="audit-empty-state">{t('cases.audit.flags.empty')}</p>
        ) : (
          <div className="audit-flag-list">
            {flags.map((flag) => (
              <div key={flag.id} className={'audit-flag-card' + (flag.status === 'RESOLVED' ? ' resolved' : '')}>
                <div className="audit-flag-header">
                  <div className="audit-flag-badges">
                    <span className={'audit-flag-severity severity-' + flag.severity.toLowerCase()}>
                      {t(`cases.audit.flagSeverity.${flag.severity}`)}
                    </span>
                    <span className={'audit-flag-status ' + (flag.status === 'OPEN' ? 'status-open' : 'status-resolved')}>
                      {flag.status === 'OPEN'
                        ? t('cases.audit.flags.statusOpen')
                        : t('cases.audit.flags.statusResolved')}
                    </span>
                  </div>
                  {flag.status === 'OPEN' ? (
                    <button
                      className="btn-secondary btn-compact"
                      type="button"
                      onClick={() => alert(t('common.comingSoon'))}
                    >
                      {t('cases.audit.flags.resolve')}
                    </button>
                  ) : null}
                </div>
                <p className="audit-flag-reason">{flag.reason}</p>
                <div className="audit-flag-meta">
                  {t('cases.audit.flags.flaggedBy')}: <strong>{flag.flaggedBy}</strong>
                  {' · '}
                  {formatAuditDateTime(flag.flaggedAt).date}
                  {flag.status === 'RESOLVED' && flag.resolvedBy ? (
                    <span>
                      {' · '}{t('cases.audit.flags.resolvedBy')} <strong>{flag.resolvedBy}</strong> on {flag.resolvedAt ? formatAuditDateTime(flag.resolvedAt).date : '—'}
                    </span>
                  ) : null}
                </div>
                {flag.status === 'RESOLVED' && flag.resolution ? (
                  <div className="audit-flag-resolution">{t('cases.audit.flags.resolution')}: {flag.resolution}</div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Section 3: Activity Log ── */}
      <section className="audit-section">
        <div className="audit-section-header">
          <div>
            <div className="audit-section-title">{t('cases.audit.activityLog.title')}</div>
            <div className="audit-section-sub">
              {t('cases.audit.activityLog.count', { count: auditLog.length })}
            </div>
          </div>
        </div>

        {auditLog.length === 0 ? (
          <p className="audit-empty-state">{t('cases.audit.activityLog.empty')}</p>
        ) : (
          <div className="audit-log-timeline">
            {auditLog.map((entry) => {
              const colorClass = ACTION_COLOR_CLASS[entry.action]
              const { date, time } = formatAuditDateTime(entry.at)
              return (
                <div key={entry.id} className="audit-log-entry">
                  <div className="audit-log-time">
                    <span className="audit-log-date">{date}</span>
                    <span className="audit-log-clock">{time}</span>
                  </div>
                  <div className="audit-log-line-wrap">
                    <span className={'audit-log-dot ' + colorClass} />
                    <div className="audit-log-track" />
                  </div>
                  <div className="audit-log-body">
                    <div className="audit-log-action">
                      {t(`cases.audit.action.${entry.action}`)}
                    </div>
                    <div className="audit-log-actor">{t('common.by')} {entry.actor}</div>
                    {entry.detail ? (
                      <div className="audit-log-detail">{entry.detail}</div>
                    ) : null}
                    {entry.meta && Object.keys(entry.meta).length > 0 && !entry.meta.severity ? (
                      <div className="audit-log-meta">
                        {Object.entries(entry.meta).map(([k, v]) => (
                          <span key={k} className="audit-log-meta-chip">{k}: {v}</span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
