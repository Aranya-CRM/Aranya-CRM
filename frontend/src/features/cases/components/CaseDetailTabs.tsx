import { type ReactNode, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchUsers } from '../../users/api/userManagement.api'
import type { UserSummary } from '../../users/types'
import type { AuditLogEntry, Case, CaseColorCode, CaseFlag, CaseNote, CaseServices, CaseStatus, CaseTask } from '../types'
import { CASE_COLOR_KEYS, CASE_SERVICE_GROUPS } from '../types'
import { CaseAuditTab } from './CaseAuditTab'
import { CaseIntensityDot } from './CaseIntensityDot'
import { CaseStatusBadge } from './CaseStatusBadge'

type TabId = 'overview' | 'services' | 'notes' | 'documents' | 'reports' | 'history' | 'audit'

interface TabDef {
  id: TabId
  labelKey: string
  managerOnly?: boolean
  count?: number
}

interface CaseDetailTabsProps {
  caseData: Case
  notes: CaseNote[]
  auditLog: AuditLogEntry[]
  flags: CaseFlag[]
  isManager: boolean
}

function activeServiceCount(services: CaseServices): number {
  return Object.values(services).filter(Boolean).length
}

export function CaseDetailTabs({ caseData, notes, auditLog, flags, isManager }: CaseDetailTabsProps) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  const serviceCount = activeServiceCount(caseData.services)

  const tabs: TabDef[] = [
    { id: 'overview',   labelKey: 'cases.tab.overview' },
    { id: 'services',   labelKey: 'cases.tab.services',  count: serviceCount },
    { id: 'notes',      labelKey: 'cases.tab.notes',     count: notes.length },
    { id: 'documents',  labelKey: 'cases.tab.documents' },
    { id: 'reports',    labelKey: 'cases.tab.reports' },
    { id: 'history',    labelKey: 'cases.tab.history' },
    { id: 'audit',      labelKey: 'cases.tab.audit',     managerOnly: true },
  ]

  const visibleTabs = isManager ? tabs : tabs.filter((t) => !t.managerOnly)

  return (
    <>
      <div className="case-detail-tab-bar">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={'case-detail-tab-btn' + (activeTab === tab.id ? ' active' : '')}
            onClick={() => setActiveTab(tab.id)}
          >
            {t(tab.labelKey)}
            {tab.id === 'audit' ? ' ⚙' : null}
            {tab.count != null && tab.count > 0 ? (
              <span className="case-tab-badge">{tab.count}</span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="case-detail-tab-content">
        {activeTab === 'overview'  ? <OverviewTab  caseData={caseData} /> : null}
        {activeTab === 'services'  ? <ServicesTab  services={caseData.services} /> : null}
        {activeTab === 'notes'     ? <NotesTab     notes={notes} /> : null}
        {activeTab === 'documents' ? <PlaceholderTab tabKey="cases.tab.documents" /> : null}
        {activeTab === 'reports'   ? <PlaceholderTab tabKey="cases.tab.reports" /> : null}
        {activeTab === 'history'   ? <PlaceholderTab tabKey="cases.tab.history" /> : null}
        {activeTab === 'audit' && isManager ? (
          <CaseAuditTab caseData={caseData} notes={notes} auditLog={auditLog} flags={flags} />
        ) : null}
      </div>
    </>
  )
}

const INTENSITY_OPTIONS: CaseColorCode[] = ['RED', 'ORANGE', 'YELLOW', 'GREEN', 'GREY']

function OverviewTab({ caseData }: { caseData: Case }) {
  const { t } = useTranslation()
  const serviceCount = activeServiceCount(caseData.services)

  const [status, setStatus] = useState<CaseStatus>(caseData.status)
  const [colorCode, setColorCode] = useState<CaseColorCode>(caseData.colorCode)
  const [assignedVolunteer, setAssignedVolunteer] = useState(caseData.assignedVolunteer ?? '')
  const [volunteers, setVolunteers] = useState<UserSummary[]>([])
  const [isSaving, setIsSaving] = useState(false)

  const isDirty =
    status !== caseData.status ||
    colorCode !== caseData.colorCode ||
    assignedVolunteer !== (caseData.assignedVolunteer ?? '')

  useEffect(() => {
    fetchUsers()
      .then((users) => setVolunteers(users.filter((u) => u.roles.includes('VOLUNTEER') && u.status === 'ACTIVE')))
      .catch(() => {})
  }, [])

  async function handleSave() {
    setIsSaving(true)
    try {
      window.alert(t('common.comingSoon'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <div className="case-detail-info-grid">
        <InfoCell label={t('cases.overview.dateOpened')} value={caseData.dateOpened} />
        <InfoCell
          label={t('cases.overview.status')}
          value={
            <select
              className="overview-select"
              value={status}
              onChange={(e) => setStatus(e.target.value as CaseStatus)}
            >
              <option value="OPEN">OPEN</option>
              <option value="SUSPENDED">SUSPENDED</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          }
        />
        <InfoCell label={t('cases.overview.caseworker')} value={caseData.socialWorker || '—'} />
        <InfoCell
          label={t('cases.overview.volunteer')}
          value={
            <select
              className="overview-select"
              value={assignedVolunteer}
              onChange={(e) => setAssignedVolunteer(e.target.value)}
            >
              <option value="">—</option>
              {volunteers.map((v) => (
                <option key={v.id} value={v.fullName}>{v.fullName}</option>
              ))}
            </select>
          }
        />
        <InfoCell
          label={t('cases.overview.intensity')}
          value={
            <div className="overview-intensity-select-row">
              <CaseIntensityDot colorCode={colorCode} />
              <select
                className="overview-select"
                value={colorCode}
                onChange={(e) => setColorCode(e.target.value as CaseColorCode)}
              >
                {INTENSITY_OPTIONS.map((code) => (
                  <option key={code} value={code}>{t(CASE_COLOR_KEYS[code])}</option>
                ))}
              </select>
            </div>
          }
        />
        <InfoCell
          label={t('cases.overview.activeModules')}
          value={t('cases.overview.activeModulesValue', { count: serviceCount })}
        />
        {caseData.comments ? (
          <InfoCell label={t('cases.overview.comments')} value={caseData.comments} wide />
        ) : null}
        {caseData.remarks ? (
          <InfoCell label={t('cases.overview.remarks')} value={caseData.remarks} wide />
        ) : null}
        {caseData.lastModifiedAt ? (
          <InfoCell
            label={t('cases.overview.lastModified')}
            value={`${caseData.lastModifiedAt}${caseData.lastModifiedBy ? ` by ${caseData.lastModifiedBy}` : ''}`}
            wide
          />
        ) : null}
      </div>

      <div className="case-overview-save-row">
        <button
          className="btn-primary"
          type="button"
          disabled={!isDirty || isSaving}
          onClick={() => void handleSave()}
        >
          {isSaving ? t('common.saving') : t('common.save')}
        </button>
      </div>

      {caseData.tasks && caseData.tasks.length > 0 ? (
        <TaskList tasks={caseData.tasks} />
      ) : null}
    </>
  )
}

function InfoCell({
  label,
  value,
  wide,
}: {
  label: string
  value: ReactNode
  wide?: boolean
}) {
  return (
    <div className={'case-detail-info-item' + (wide ? ' wide' : '')}>
      <span className="case-detail-info-label">{label}</span>
      <span className="case-detail-info-value">{value}</span>
    </div>
  )
}

function TaskList({ tasks }: { tasks: CaseTask[] }) {
  const { t, i18n } = useTranslation()
  const isZh = i18n.language === 'zh'

  return (
    <div>
      <div className="case-task-section-title">{t('cases.tasks.title')}</div>
      <div className="case-task-list">
        {tasks.map((task) => (
          <div key={task.id} className="case-task-item">
            <div className={'case-task-checkbox' + (task.completed ? ' done' : '')}>
              {task.completed ? (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4L3.5 6.5L9 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : null}
            </div>
            <div className="case-task-body">
              <div className={'case-task-title-zh' + (task.completed ? ' done' : '')}>
                {isZh ? task.titleZh : task.titleEn}
              </div>
              <div className="case-task-meta">
                {t('cases.tasks.due')}: {task.dueDate}
                {task.completed && task.completedAt ? (
                  <span className="case-task-done-badge">
                    {' '}✓ {t('cases.tasks.done')}: {formatCompletedAt(task.completedAt)}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function formatCompletedAt(iso: string): string {
  const d = new Date(iso)
  const date = d.toISOString().slice(0, 10)
  const hhmm = d.toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Singapore' })
  return `${date} ${hhmm}`
}

const SERVICE_GROUP_KEYS = ['practical', 'emotional', 'admin', 'spiritual'] as const

function ServicesTab({ services }: { services: CaseServices }) {
  const { t } = useTranslation()

  return (
    <>
      {SERVICE_GROUP_KEYS.map((groupKey) => {
        const items = (Object.keys(CASE_SERVICE_GROUPS) as (keyof CaseServices)[]).filter(
          (k) => CASE_SERVICE_GROUPS[k] === groupKey,
        )
        return (
          <div key={groupKey}>
            <div className="case-services-section-title">
              {t(`cases.serviceGroup.${groupKey}`)}
            </div>
            <div className="case-services-grid">
              {items.map((key) => (
                <div key={key} className="case-services-item">
                  <span className={'dot ' + (services[key] ? 'dot-yes' : 'dot-no')} />
                  {t(`cases.service.${key}`)}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </>
  )
}

function NotesTab({ notes }: { notes: CaseNote[] }) {
  const { t } = useTranslation()

  if (notes.length === 0) {
    return <p className="case-placeholder-text">{t('cases.notes.empty')}</p>
  }

  return (
    <div className="case-note-list">
      {notes.map((note) => (
        <div key={note.id} className="case-note-item">
          <div className="case-note-header">
            <span className="case-note-date">{note.date}</span>
            <span className="case-note-author">{t('cases.notes.by')}: {note.recordedBy}</span>
          </div>
          <p className="case-note-content">{note.content}</p>
          {note.followUp ? (
            <div className="case-note-followup">{t('cases.notes.followup')}: {note.followUp}</div>
          ) : null}
        </div>
      ))}
    </div>
  )
}

function PlaceholderTab({ tabKey }: { tabKey: string }) {
  const { t } = useTranslation()
  return (
    <p className="case-placeholder-text">
      {t('cases.placeholder', { tab: t(tabKey) })}
    </p>
  )
}
