import type { AuditLogAction, AuditLogEntry, Case, CaseFlag, CaseNote } from '../types'

interface CaseAuditTabProps {
  caseData: Case
  notes: CaseNote[]
  auditLog: AuditLogEntry[]
  flags: CaseFlag[]
}

interface ComplianceItem {
  id: string
  labelZh: string
  labelEn: string
  passed: boolean
  failNote?: string
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
      labelZh: '主责社工已分配',
      labelEn: 'Caseworker assigned',
      passed: Boolean(caseData.socialWorker),
    },
    {
      id: 'volunteer_assigned',
      labelZh: '义工已分配',
      labelEn: 'Volunteer assigned',
      passed: Boolean(caseData.assignedVolunteer),
      failNote: '建议为活跃个案分配跟进义工',
    },
    {
      id: 'early_note',
      labelZh: '开案7天内有案例笔记',
      labelEn: 'Note recorded within 7 days of opening',
      passed: hasNoteWithin7Days,
      failNote: '开案后应在7天内完成首次评估记录',
    },
    {
      id: 'has_notes',
      labelZh: '至少有一条案例笔记',
      labelEn: 'At least one case note recorded',
      passed: notes.length > 0,
    },
    {
      id: 'tasks_defined',
      labelZh: '已建立任务清单',
      labelEn: 'Task list defined',
      passed: Boolean(caseData.tasks && caseData.tasks.length > 0),
      failNote: '建立任务清单有助于追踪跟进进度',
    },
    {
      id: 'crisis_for_red',
      labelZh: '红色个案: 危机干预服务已启用',
      labelEn: 'Red case: Crisis Intervention module enabled',
      passed: !isRed || caseData.services.crisisIntervention,
      failNote: '红色级别个案须启用危机干预 (Crisis Intervention) 服务模块',
    },
    {
      id: 'status_ok',
      labelZh: '暂停个案须有案例笔记记录原因',
      labelEn: 'Suspended case must have notes explaining reason',
      passed: caseData.status !== 'SUSPENDED' || notes.length > 0,
    },
  ]
}

const ACTION_CONFIG: Record<AuditLogAction, { labelZh: string; labelEn: string; colorClass: string }> = {
  CASE_CREATED:        { labelZh: '个案已创建',     labelEn: 'Case Created',          colorClass: 'audit-dot-green'  },
  CASE_CLOSED:         { labelZh: '个案已关闭',     labelEn: 'Case Closed',           colorClass: 'audit-dot-grey'   },
  CASE_REOPENED:       { labelZh: '个案已重新开启', labelEn: 'Case Reopened',         colorClass: 'audit-dot-green'  },
  STATUS_CHANGED:      { labelZh: '状态已变更',     labelEn: 'Status Changed',        colorClass: 'audit-dot-orange' },
  INTENSITY_CHANGED:   { labelZh: '强度已变更',     labelEn: 'Intensity Changed',     colorClass: 'audit-dot-red'    },
  NOTE_ADDED:          { labelZh: '案例笔记已添加', labelEn: 'Note Added',            colorClass: 'audit-dot-blue'   },
  TASK_COMPLETED:      { labelZh: '任务已完成',     labelEn: 'Task Completed',        colorClass: 'audit-dot-green'  },
  TASK_ADDED:          { labelZh: '任务已添加',     labelEn: 'Task Added',            colorClass: 'audit-dot-blue'   },
  CASEWORKER_ASSIGNED: { labelZh: '社工已分配',     labelEn: 'Caseworker Assigned',   colorClass: 'audit-dot-grey'   },
  VOLUNTEER_ASSIGNED:  { labelZh: '义工已分配',     labelEn: 'Volunteer Assigned',    colorClass: 'audit-dot-grey'   },
  SERVICE_UPDATED:     { labelZh: '服务模块已更新', labelEn: 'Service Updated',       colorClass: 'audit-dot-blue'   },
  CASE_FLAGGED:        { labelZh: '个案已标记',     labelEn: 'Case Flagged',          colorClass: 'audit-dot-purple' },
  FLAG_RESOLVED:       { labelZh: '标记已解决',     labelEn: 'Flag Resolved',         colorClass: 'audit-dot-green'  },
}

const FLAG_SEVERITY_LABELS: Record<string, { zh: string; en: string }> = {
  HIGH:   { zh: '高',  en: 'High'   },
  MEDIUM: { zh: '中',  en: 'Medium' },
  LOW:    { zh: '低',  en: 'Low'    },
}

function formatAuditDateTime(iso: string): { date: string; time: string } {
  const d = new Date(iso)
  return {
    date: d.toISOString().slice(0, 10),
    time: d.toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Singapore' }),
  }
}

export function CaseAuditTab({ caseData, notes, auditLog, flags }: CaseAuditTabProps) {
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
            <div className="audit-section-title">合规状态 · Compliance Status</div>
            <div className="audit-section-sub">根据个案数据自动检查 · Auto-checked from case data</div>
          </div>
          <span className={'audit-score-badge ' + scoreClass}>{passed} / {total} 项通过</span>
        </div>
        <div className="audit-compliance-list">
          {compliance.map((item) => (
            <div key={item.id} className={'audit-compliance-item' + (item.passed ? '' : ' fail')}>
              <span className={'audit-compliance-icon' + (item.passed ? ' pass' : ' fail')}>
                {item.passed ? '✓' : '✗'}
              </span>
              <div className="audit-compliance-body">
                <span className="audit-compliance-label">{item.labelZh} · {item.labelEn}</span>
                {!item.passed && item.failNote ? (
                  <span className="audit-compliance-note">{item.failNote}</span>
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
            <div className="audit-section-title">标记管理 · Flag Management</div>
            <div className="audit-section-sub">
              {openFlags.length > 0
                ? `${openFlags.length} 个未解决标记 · ${openFlags.length} open flag(s)`
                : '暂无未解决标记 · No open flags'}
            </div>
          </div>
          <button
            className="btn-audit btn-compact"
            type="button"
            onClick={() => alert('功能即将推出 / Coming soon')}
          >
            ⚑ 标记个案 · Flag Case
          </button>
        </div>

        {flags.length === 0 ? (
          <p className="audit-empty-state">暂无标记记录 · No flags recorded for this case.</p>
        ) : (
          <div className="audit-flag-list">
            {flags.map((flag) => (
              <div key={flag.id} className={'audit-flag-card' + (flag.status === 'RESOLVED' ? ' resolved' : '')}>
                <div className="audit-flag-header">
                  <div className="audit-flag-badges">
                    <span className={'audit-flag-severity severity-' + flag.severity.toLowerCase()}>
                      {FLAG_SEVERITY_LABELS[flag.severity]?.zh ?? flag.severity}
                      {' / '}
                      {FLAG_SEVERITY_LABELS[flag.severity]?.en ?? flag.severity}
                    </span>
                    <span className={'audit-flag-status ' + (flag.status === 'OPEN' ? 'status-open' : 'status-resolved')}>
                      {flag.status === 'OPEN' ? '未解决 · Open' : '已解决 · Resolved'}
                    </span>
                  </div>
                  {flag.status === 'OPEN' ? (
                    <button
                      className="btn-secondary btn-compact"
                      type="button"
                      onClick={() => alert('功能即将推出 / Coming soon')}
                    >
                      标记为已解决 · Resolve
                    </button>
                  ) : null}
                </div>
                <p className="audit-flag-reason">{flag.reason}</p>
                <div className="audit-flag-meta">
                  标记人 / Flagged by: <strong>{flag.flaggedBy}</strong>
                  {' · '}
                  {formatAuditDateTime(flag.flaggedAt).date}
                  {flag.status === 'RESOLVED' && flag.resolvedBy ? (
                    <span>
                      {' · '}已解决 / Resolved by <strong>{flag.resolvedBy}</strong> on {flag.resolvedAt ? formatAuditDateTime(flag.resolvedAt).date : '—'}
                    </span>
                  ) : null}
                </div>
                {flag.status === 'RESOLVED' && flag.resolution ? (
                  <div className="audit-flag-resolution">处理说明 / Resolution: {flag.resolution}</div>
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
            <div className="audit-section-title">操作日志 · Activity Log</div>
            <div className="audit-section-sub">{auditLog.length} 条记录 · {auditLog.length} entries</div>
          </div>
        </div>

        {auditLog.length === 0 ? (
          <p className="audit-empty-state">暂无操作记录 · No activity recorded.</p>
        ) : (
          <div className="audit-log-timeline">
            {auditLog.map((entry) => {
              const config = ACTION_CONFIG[entry.action]
              const { date, time } = formatAuditDateTime(entry.at)
              return (
                <div key={entry.id} className="audit-log-entry">
                  <div className="audit-log-time">
                    <span className="audit-log-date">{date}</span>
                    <span className="audit-log-clock">{time}</span>
                  </div>
                  <div className="audit-log-line-wrap">
                    <span className={'audit-log-dot ' + config.colorClass} />
                    <div className="audit-log-track" />
                  </div>
                  <div className="audit-log-body">
                    <div className="audit-log-action">
                      {config.labelZh} · {config.labelEn}
                    </div>
                    <div className="audit-log-actor">by {entry.actor}</div>
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
