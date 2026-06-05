import { type FormEvent, type ReactNode, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAccess } from '../../../shared/auth/useAccess'
import { useAuth } from '../../../contexts/AuthContext'
import { fetchUsers } from '../../users/api/userManagement.api'
import type { UserSummary } from '../../users/types'
import { useCreateCaseNote, useCreateServiceEvent, useDeleteCaseNote, useUpdateCase, useUpdateCaseServices } from '../hooks'
import type { AuditLogEntry, Case, CaseColorCode, CaseFlag, CaseNote, CaseServices, CaseStatus, CaseTask, ServiceCalendarEvent } from '../types'
import { CASE_COLOR_KEYS, CASE_SERVICE_GROUPS } from '../types'
import { CaseAuditTab } from './CaseAuditTab'
import { CaseReportsTab } from './CaseReportsTab'
import { CaseServiceCalendar } from './CaseServiceCalendar'
import { CaseIntensityDot } from './CaseIntensityDot'

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
        {activeTab === 'overview'  ? <OverviewTab  caseData={caseData} isManager={isManager} /> : null}
        {activeTab === 'services'  ? <ServicesTab  caseData={caseData} isManager={isManager} /> : null}
        {activeTab === 'notes'     ? <NotesTab     caseId={caseData.id} notes={notes} /> : null}
        {activeTab === 'documents' ? <PlaceholderTab tabKey="cases.tab.documents" /> : null}
        {activeTab === 'reports'   ? <CaseReportsTab caseData={caseData} isManager={isManager} /> : null}
        {activeTab === 'history'   ? <PlaceholderTab tabKey="cases.tab.history" /> : null}
        {activeTab === 'audit' && isManager ? (
          <CaseAuditTab caseData={caseData} notes={notes} auditLog={auditLog} flags={flags} />
        ) : null}
      </div>
    </>
  )
}

const INTENSITY_OPTIONS: CaseColorCode[] = ['RED', 'ORANGE', 'YELLOW', 'GREEN', 'GREY']

function OverviewTab({ caseData, isManager }: { caseData: Case; isManager: boolean }) {
  const { t } = useTranslation()
  const { resolve } = useAccess()
  const serviceCount = activeServiceCount(caseData.services)

  const canChangeStatus   = resolve('cases:status.close')
  const canAssign         = resolve('cases:assign') || resolve('cases:reassign')
  const canEditIntensity  = resolve('cases:assign')
  const canEdit           = canChangeStatus || canAssign || canEditIntensity

  const [status, setStatus] = useState<CaseStatus>(caseData.status)
  const [colorCode, setColorCode] = useState<CaseColorCode>(caseData.colorCode)
  const [assignedVolunteer, setAssignedVolunteer] = useState(caseData.assignedVolunteer ?? '')
  const [savedStatus, setSavedStatus] = useState<CaseStatus>(caseData.status)
  const [savedColorCode, setSavedColorCode] = useState<CaseColorCode>(caseData.colorCode)
  const [savedAssignedVolunteer, setSavedAssignedVolunteer] = useState(caseData.assignedVolunteer ?? '')
  const [savedSocialWorkerId, setSavedSocialWorkerId] = useState(caseData.socialWorkerId ?? '')
  const [savedSocialWorkerName, setSavedSocialWorkerName] = useState(caseData.socialWorker ?? '')
  const [savedComments, setSavedComments] = useState(caseData.comments ?? '')
  const [savedRemarks, setSavedRemarks] = useState(caseData.remarks ?? '')
  const [socialWorkerId, setSocialWorkerId] = useState(caseData.socialWorkerId ?? '')
  const [comments, setComments] = useState(caseData.comments ?? '')
  const [remarks, setRemarks] = useState(caseData.remarks ?? '')
  const [volunteers, setVolunteers] = useState<UserSummary[]>([])
  const [socialWorkers, setSocialWorkers] = useState<UserSummary[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const updateCase = useUpdateCase()

  const managerEditing = !isManager || isEditing
  const isDirty =
    status !== savedStatus ||
    colorCode !== savedColorCode ||
    assignedVolunteer !== savedAssignedVolunteer ||
    socialWorkerId !== savedSocialWorkerId ||
    comments !== savedComments ||
    remarks !== savedRemarks

  useEffect(() => {
    if (!canAssign && !isManager) return
    fetchUsers()
      .then((users) => {
        setVolunteers(users.filter((u) => u.roles.includes('VOLUNTEER') && u.status === 'ACTIVE'))
        setSocialWorkers(users.filter((u) => u.roles.includes('SOCIAL_WORKER') && u.status === 'ACTIVE'))
      })
      .catch(() => {})
  }, [canAssign, isManager])

  async function handleSave() {
    const updated = await updateCase.mutateAsync({
      id: caseData.id,
      data: {
        status,
        colorCode,
        socialWorkerId: socialWorkerId || undefined,
        comments,
        remarks,
      },
    })
    const selectedWorker = socialWorkers.find((worker) => String(worker.id) === String(socialWorkerId))
    setSavedStatus(updated.status)
    setSavedColorCode(updated.colorCode)
    setSavedAssignedVolunteer(updated.assignedVolunteer ?? assignedVolunteer)
    setSavedSocialWorkerId(updated.socialWorkerId ?? socialWorkerId)
    setSavedSocialWorkerName(updated.socialWorker || selectedWorker?.fullName || savedSocialWorkerName)
    setSavedComments(updated.comments ?? comments)
    setSavedRemarks(updated.remarks ?? remarks)
    setIsEditing(false)
  }

  function handleCancelEdit() {
    setStatus(savedStatus)
    setColorCode(savedColorCode)
    setAssignedVolunteer(savedAssignedVolunteer)
    setSocialWorkerId(savedSocialWorkerId)
    setComments(savedComments)
    setRemarks(savedRemarks)
    setIsEditing(false)
  }

  function updateSocialWorker(value: string) {
    setSocialWorkerId(value)
  }

  function handleEditClick() {
    setIsEditing(true)
  }

  return (
    <>
      <div className="case-detail-info-grid">
        <InfoCell label={t('cases.overview.dateOpened')} value={caseData.dateOpened} />
        <InfoCell
          label={t('cases.overview.status')}
          value={canChangeStatus && managerEditing ? (
            <select
              className="overview-select"
              value={status}
              onChange={(e) => setStatus(e.target.value as CaseStatus)}
            >
              <option value="OPEN">OPEN</option>
              <option value="SUSPENDED">SUSPENDED</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          ) : (
            savedStatus
          )}
        />
        <InfoCell
          label={t('cases.overview.caseworker')}
          value={isManager && managerEditing ? (
            <select
              className="overview-select"
              value={socialWorkerId}
              onChange={(e) => updateSocialWorker(e.target.value)}
            >
              <option value="">—</option>
              {socialWorkers.map((worker) => (
                <option key={worker.id} value={worker.id}>{worker.fullName}</option>
              ))}
            </select>
          ) : (
            savedSocialWorkerName || '—'
          )}
        />
        {!isManager ? (
          <InfoCell
            label={t('cases.overview.volunteer')}
            value={canAssign && managerEditing ? (
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
            ) : (
              savedAssignedVolunteer || '—'
            )}
          />
        ) : null}
        <InfoCell
          label={t('cases.overview.intensity')}
          value={canEditIntensity && managerEditing ? (
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
          ) : (
            <div className="overview-intensity-select-row">
              <CaseIntensityDot colorCode={savedColorCode} />
              {t(CASE_COLOR_KEYS[savedColorCode])}
            </div>
          )}
        />
        <InfoCell
          label={t('cases.overview.activeModules')}
          value={t('cases.overview.activeModulesValue', { count: serviceCount })}
        />
        <InfoCell
          label={t('cases.overview.comments')}
          value={isManager && managerEditing ? (
            <textarea className="overview-textarea" value={comments} onChange={(e) => setComments(e.target.value)} />
          ) : (
            savedComments || '—'
          )}
          wide
        />
        <InfoCell
          label={t('cases.overview.remarks')}
          value={isManager && managerEditing ? (
            <textarea className="overview-textarea" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          ) : (
            savedRemarks || '—'
          )}
          wide
        />
        {caseData.lastModifiedAt ? (
          <InfoCell
            label={t('cases.overview.lastModified')}
            value={`${caseData.lastModifiedAt}${caseData.lastModifiedBy ? ` by ${caseData.lastModifiedBy}` : ''}`}
            wide
          />
        ) : null}
      </div>

      {canEdit ? (
        <div className="case-overview-save-row">
          {isManager && !isEditing ? (
            <button className="btn-primary" type="button" onClick={handleEditClick}>
              {t('common.edit')}
            </button>
          ) : (
            <>
            <button
              className="btn-primary"
              type="button"
              disabled={!isDirty || updateCase.isPending}
              onClick={() => void handleSave()}
            >
              {updateCase.isPending ? t('common.saving') : t('common.save')}
            </button>
            {isManager ? (
              <button className="btn-secondary" type="button" disabled={updateCase.isPending} onClick={handleCancelEdit}>
                {t('common.cancel')}
              </button>
            ) : null}
            </>
          )}
        </div>
      ) : null}

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

const SERVICE_GROUP_KEYS = ['housing', 'financial', 'food', 'other'] as const

function ServicesTab({ caseData, isManager }: { caseData: Case; isManager: boolean }) {
  const { t } = useTranslation()
  const { resolve } = useAccess()
  const [isEditing, setIsEditing] = useState(false)
  const [serviceState, setServiceState] = useState<CaseServices>(caseData.services)
  const [users, setUsers] = useState<UserSummary[]>([])
  const [eventServiceKey, setEventServiceKey] = useState<keyof CaseServices | ''>('')
  const [assignedUserId, setAssignedUserId] = useState('')
  const [scheduledStart, setScheduledStart] = useState('')
  const [location, setLocation] = useState(caseData.venue ?? '')
  const updateServices = useUpdateCaseServices(caseData.id)
  const createEvent = useCreateServiceEvent(caseData.id)
  const canAssignEvent = resolve('cases:assign') || resolve('cases:reassign')

  useEffect(() => {
    if (!canAssignEvent) return
    fetchUsers()
      .then((items) => setUsers(items.filter((user) => user.status === 'ACTIVE')))
      .catch(() => {})
  }, [canAssignEvent])

  const selectedServiceKeys = (Object.keys(serviceState) as Array<keyof CaseServices>).filter((key) => serviceState[key])
  const assignableUsers = users.filter((user) => (
    isManager
      ? user.roles.includes('VOLUNTEER') || user.roles.includes('SOCIAL_WORKER')
      : user.roles.includes('VOLUNTEER')
  ))
  const calendarEvents: ServiceCalendarEvent[] = (caseData.serviceEvents ?? []).map((event) => ({
    id: String(event.id),
    title: event.title,
    start: event.scheduledStart,
    extendedProps: {
      serviceType: event.serviceKey,
      note: event.assignedUserName ?? undefined,
    },
  }))

  function toggleService(key: keyof CaseServices) {
    setServiceState((current) => ({ ...current, [key]: !current[key] }))
  }

  async function saveServices() {
    await updateServices.mutateAsync(selectedServiceKeys)
    setIsEditing(false)
  }

  async function submitEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!eventServiceKey || !assignedUserId || !scheduledStart) return
    await createEvent.mutateAsync({
      serviceKey: eventServiceKey,
      assignedUserId,
      scheduledStart,
      location: location.trim() || undefined,
    })
    setEventServiceKey('')
    setAssignedUserId('')
    setScheduledStart('')
  }

  return (
    <>
      {isManager ? (
        <div className="case-services-actions">
          {isEditing ? (
            <>
              <button className="btn-primary" type="button" disabled={updateServices.isPending} onClick={() => void saveServices()}>
                {updateServices.isPending ? t('common.saving') : t('common.save')}
              </button>
              <button
                className="btn-secondary"
                type="button"
                disabled={updateServices.isPending}
                onClick={() => {
                  setServiceState(caseData.services)
                  setIsEditing(false)
                }}
              >
                {t('common.cancel')}
              </button>
            </>
          ) : (
            <button className="btn-primary" type="button" onClick={() => setIsEditing(true)}>
              {t('common.edit')}
            </button>
          )}
        </div>
      ) : null}
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
                  <input
                    type="checkbox"
                    className="service-check"
                    checked={serviceState[key]}
                    disabled={!isEditing}
                    onChange={() => toggleService(key)}
                  />
                  {t(`cases.service.${key}`)}
                </div>
              ))}
            </div>
          </div>
        )
      })}

      <div className="service-calendar-section">
        <div className="case-services-section-title">
          {t('cases.services.calendarTitle')}
        </div>
        <CaseServiceCalendar events={calendarEvents} />
      </div>

      {canAssignEvent && selectedServiceKeys.length > 0 ? (
        <form className="case-event-form" onSubmit={(event) => void submitEvent(event)}>
          <h3>{t('cases.services.addEvent')}</h3>
          <label>
            <span>{t('cases.services.service')}</span>
            <select value={eventServiceKey} required onChange={(event) => setEventServiceKey(event.target.value as keyof CaseServices)}>
              <option value="">{t('cases.services.selectService')}</option>
              {selectedServiceKeys.map((key) => (
                <option key={key} value={key}>{t(`cases.service.${key}`)}</option>
              ))}
            </select>
          </label>
          <label>
            <span>{t('cases.services.assignee')}</span>
            <select value={assignedUserId} required onChange={(event) => setAssignedUserId(event.target.value)}>
              <option value="">{t('cases.services.selectAssignee')}</option>
              {assignableUsers.map((user) => (
                <option key={user.id} value={user.id}>{user.fullName}</option>
              ))}
            </select>
          </label>
          <label>
            <span>{t('cases.services.time')}</span>
            <input type="datetime-local" value={scheduledStart} required onChange={(event) => setScheduledStart(event.target.value)} />
          </label>
          <label>
            <span>{t('cases.services.location')}</span>
            <input value={location} onChange={(event) => setLocation(event.target.value)} />
          </label>
          <button className="btn-primary" type="submit" disabled={createEvent.isPending}>
            {createEvent.isPending ? t('common.saving') : t('cases.services.createEvent')}
          </button>
        </form>
      ) : null}
    </>
  )
}

function NotesTab({ caseId, notes }: { caseId: string; notes: CaseNote[] }) {
  const { t } = useTranslation()
  const { resolve } = useAccess()
  const { user } = useAuth()

  const canCreateNote   = resolve('cases:notes.create')
  const canEditOwnNote  = resolve('cases:notes.update.own')
  const canDeleteAnyNote = resolve('cases:notes.delete')
  const createNote = useCreateCaseNote()
  const deleteNote = useDeleteCaseNote(caseId)
  const [content, setContent] = useState('')
  const [followUp, setFollowUp] = useState('')

  async function submitNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!content.trim()) return
    await createNote.mutateAsync({ caseId, content: content.trim(), followUp: followUp.trim() || undefined })
    setContent('')
    setFollowUp('')
  }

  return (
    <>
      {canCreateNote ? (
        <form className="case-note-form" onSubmit={(event) => void submitNote(event)}>
          <textarea
            className="overview-textarea"
            value={content}
            placeholder={t('cases.notes.placeholder')}
            onChange={(event) => setContent(event.target.value)}
          />
          <input
            className="overview-select"
            value={followUp}
            placeholder={t('cases.notes.followupPlaceholder')}
            onChange={(event) => setFollowUp(event.target.value)}
          />
          <div className="case-notes-actions">
            <button className="btn-primary" type="submit" disabled={createNote.isPending || !content.trim()}>
              {createNote.isPending ? t('common.saving') : t('cases.notes.addNote')}
            </button>
          </div>
        </form>
      ) : null}

      {notes.length === 0 ? (
        <p className="case-placeholder-text">{t('cases.notes.empty')}</p>
      ) : (
        <div className="case-note-list">
          {notes.map((note) => {
            const isOwn = note.recordedBy === (user?.fullName ?? '')
            const canDeleteNote = canDeleteAnyNote || (canEditOwnNote && isOwn)
            return (
              <div key={note.id} className="case-note-item">
                <div className="case-note-header">
                  <span className="case-note-date">{note.date}</span>
                  <span className="case-note-author">{t('cases.notes.by')}: {note.recordedBy}</span>
                  {canEditOwnNote && isOwn ? (
                    <button
                      className="btn-note-edit"
                      type="button"
                      onClick={() => window.alert(t('common.comingSoon'))}
                    >
                      {t('common.edit')}
                    </button>
                  ) : null}
                  {canDeleteNote ? (
                    <button
                      className="btn-note-edit"
                      type="button"
                      disabled={deleteNote.isPending}
                      onClick={() => void deleteNote.mutateAsync(note.id)}
                    >
                      {t('common.delete')}
                    </button>
                  ) : null}
                </div>
                <p className="case-note-content">{note.content}</p>
                {note.followUp ? (
                  <div className="case-note-followup">{t('cases.notes.followup')}: {note.followUp}</div>
                ) : null}
              </div>
            )
          })}
        </div>
      )}
    </>
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
