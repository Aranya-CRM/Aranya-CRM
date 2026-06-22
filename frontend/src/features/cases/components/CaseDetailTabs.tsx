import { type FormEvent, type ReactNode, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAccess } from '../../../shared/auth/useAccess'
import { useAuth } from '../../../contexts/AuthContext'
import { addLocalPendingApproval, useLocalPendingApprovals } from '../../../shared/approvals/localPendingApprovals'
import { useApprovalAssigneeOptions } from '../../../shared/approvals/useApprovalAssigneeOptions'
import { ApprovalConfirmModal } from '../../../shared/ui'
import { fetchUsers } from '../../users/api/userManagement.api'
import type { UserSummary } from '../../users/types'
import { useCreateCaseNote, useCreateServiceEvent, useDeleteCaseNote, useDeleteServiceEvent, useUpdateCase, useUpdateCaseServices } from '../hooks'
import type { AuditLogEntry, Case, CaseColorCode, CaseFlag, CaseNote, CaseServices, CaseStatus, CaseTask, ServiceCalendarEvent } from '../types'
import { CASE_COLOR_KEYS, CASE_SERVICE_GROUPS, emptyCaseServices } from '../types'
import { CaseAuditTab } from './CaseAuditTab'
import { CaseReportsTab } from './CaseReportsTab'
import { CaseServiceCalendar } from './CaseServiceCalendar'
import { CaseIntensityDot } from './CaseIntensityDot'

type TabId = 'overview' | 'services' | 'calendar' | 'notes' | 'documents' | 'reports' | 'history' | 'audit'

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
    { id: 'calendar',   labelKey: 'cases.tab.calendar' },
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
        {activeTab === 'calendar'  ? <CalendarTab  caseData={caseData} /> : null}
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

interface PendingServiceChange {
  operation: 'add' | 'remove'
  serviceKeys: Array<keyof CaseServices>
}

function uniqueServiceKeys(keys: Array<keyof CaseServices>): Array<keyof CaseServices> {
  return Array.from(new Set(keys))
}

function parsePendingServicePayload(payloadJson?: string | null): PendingServiceChange | null {
  if (!payloadJson) return null

  try {
    const parsed = JSON.parse(payloadJson) as { operation?: string; serviceKeys?: unknown }
    if (parsed.operation !== 'add' && parsed.operation !== 'remove') return null
    if (!Array.isArray(parsed.serviceKeys)) return null

    const validKeys = new Set(Object.keys(emptyCaseServices()))
    const serviceKeys = parsed.serviceKeys.filter((key): key is keyof CaseServices => (
      typeof key === 'string' && validKeys.has(key)
    ))

    if (serviceKeys.length === 0) return null
    return { operation: parsed.operation, serviceKeys }
  } catch {
    return null
  }
}

function ServicesTab({ caseData, isManager }: { caseData: Case; isManager: boolean }) {
  const { t } = useTranslation()
  const { resolve } = useAccess()
  const [users, setUsers] = useState<UserSummary[]>([])
  const [servicesToAdd, setServicesToAdd] = useState<Array<keyof CaseServices>>([])
  const [serviceToRemove, setServiceToRemove] = useState<keyof CaseServices | null>(null)
  const [eventDrafts, setEventDrafts] = useState<Record<string, { assignedUserId: string; scheduledStart: string; location: string; workDescription: string; contact: string }>>({})
  const [showServiceRequest, setShowServiceRequest] = useState(false)
  const [expandedServiceKey, setExpandedServiceKey] = useState<keyof CaseServices | null>(null)
  const [showServiceApprovalConfirm, setShowServiceApprovalConfirm] = useState(false)
  const updateServices = useUpdateCaseServices(caseData.id)
  const createEvent = useCreateServiceEvent(caseData.id)
  const deleteEvent = useDeleteServiceEvent(caseData.id)
  const canRequestServices = resolve('cases:services.create')
  const canCreateEvent = resolve('cases:services.create')
  const [approvalMessage, setApprovalMessage] = useState('')
  const pendingCaseApprovals = useLocalPendingApprovals('CASE', caseData.id)
  const approvalAssignees = useApprovalAssigneeOptions()

  useEffect(() => {
    if (!canCreateEvent) return
    fetchUsers()
      .then((items) => setUsers(items.filter((user) => user.status === 'ACTIVE')))
      .catch(() => {})
  }, [canCreateEvent])

  const approvedServiceKeys = (Object.keys(caseData.services) as Array<keyof CaseServices>).filter((key) => caseData.services[key])
  const pendingServiceChanges = pendingCaseApprovals
    .filter((approval) => approval.type === 'CASE_SERVICE_UPDATE')
    .map((approval) => parsePendingServicePayload(approval.payloadJson))
    .filter((item): item is PendingServiceChange => item !== null)
  const pendingAddKeys = uniqueServiceKeys(pendingServiceChanges.filter((item) => item.operation === 'add').flatMap((item) => item.serviceKeys))
  const pendingRemoveKeys = uniqueServiceKeys(pendingServiceChanges.filter((item) => item.operation === 'remove').flatMap((item) => item.serviceKeys))
  const displayedServiceKeys = uniqueServiceKeys([...approvedServiceKeys, ...pendingAddKeys])
  const availableServiceKeys = (Object.keys(caseData.services) as Array<keyof CaseServices>)
    .filter((key) => !caseData.services[key] && !pendingAddKeys.includes(key))
  const assignableUsers = users.filter((user) => (
    isManager
      ? user.status === 'ACTIVE'
      : user.roles.includes('VOLUNTEER')
  ))

  function toggleServiceToAdd(serviceKey: keyof CaseServices, checked: boolean) {
    setServicesToAdd((current) => {
      if (checked) {
        return current.includes(serviceKey) ? current : [...current, serviceKey]
      }
      return current.filter((key) => key !== serviceKey)
    })
  }

  function updateEventDraft(serviceKey: keyof CaseServices, patch: Partial<{ assignedUserId: string; scheduledStart: string; reportDueAt: string; location: string; workDescription: string; notes: string }>) {
    setEventDrafts((current) => ({
      ...current,
      [serviceKey]: {
        assignedUserId: current[serviceKey]?.assignedUserId ?? '',
        scheduledStart: current[serviceKey]?.scheduledStart ?? '',
        reportDueAt: current[serviceKey]?.reportDueAt ?? '',
        location: current[serviceKey]?.location ?? caseData.venue ?? '',
        workDescription: current[serviceKey]?.workDescription ?? '',
        contact: current[serviceKey]?.contact ?? '',
        ...patch,
      },
    }))
  }

  function submitServiceApproval(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (servicesToAdd.length === 0) return
    setShowServiceApprovalConfirm(true)
  }

  async function requestAddServices(approverId?: number) {
    if (servicesToAdd.length === 0) return
    const nextServices = uniqueServiceKeys([...approvedServiceKeys, ...pendingAddKeys, ...servicesToAdd])
    const approval = await updateServices.mutateAsync({ services: nextServices, approverId })
    addLocalPendingApproval({
      ...approval,
      targetType: approval.targetType ?? 'CASE',
      targetId: approval.targetId ?? caseData.id,
      targetLabel: approval.targetLabel ?? caseData.caseNo,
      payloadJson: JSON.stringify({ operation: 'add', serviceKeys: servicesToAdd }),
    })
    setApprovalMessage(t('cases.services.approvalSubmitted'))
    setServicesToAdd([])
    setShowServiceRequest(false)
    setShowServiceApprovalConfirm(false)
  }

  async function requestRemoveService(approverId?: number) {
    if (!serviceToRemove) return
    const serviceKey = serviceToRemove
    const nextServices = uniqueServiceKeys([...approvedServiceKeys, ...pendingAddKeys]).filter((key) => key !== serviceKey)
    const approval = await updateServices.mutateAsync({ services: nextServices, approverId })
    addLocalPendingApproval({
      ...approval,
      targetType: approval.targetType ?? 'CASE',
      targetId: approval.targetId ?? caseData.id,
      targetLabel: approval.targetLabel ?? caseData.caseNo,
      payloadJson: JSON.stringify({ operation: 'remove', serviceKeys: [serviceKey] }),
    })
    setApprovalMessage(t('cases.services.removeApprovalSubmitted'))
    setServiceToRemove(null)
  }

  async function submitEvent(event: FormEvent<HTMLFormElement>, serviceKey: keyof CaseServices) {
    event.preventDefault()
    const draft = eventDrafts[serviceKey]
    if (!draft?.assignedUserId || !draft.scheduledStart || !draft.workDescription.trim()) return
    await createEvent.mutateAsync({
      serviceKey,
      assignedUserId: draft.assignedUserId,
      scheduledStart: draft.scheduledStart,
      reportDueAt: draft.reportDueAt || undefined,
      workDescription: draft.workDescription.trim(),
      notes: draft.contact.trim() || undefined,
      location: draft.location.trim() || undefined,
    })
    setApprovalMessage(t('cases.services.eventCreated'))
    setEventDrafts((current) => ({
      ...current,
      [serviceKey]: { assignedUserId: '', scheduledStart: '', location: caseData.venue ?? '', workDescription: '', contact: '' },
    }))
    setExpandedServiceKey(null)
  }

  return (
    <>
      {approvalMessage ? <div className="case-placeholder-text">{approvalMessage}</div> : null}

      {displayedServiceKeys.length > 0 ? (
        <div className="case-service-card-grid">
          {displayedServiceKeys.map((serviceKey) => {
            const draft = eventDrafts[serviceKey] ?? { assignedUserId: '', scheduledStart: '', location: caseData.venue ?? '', workDescription: '', contact: '' }
            const serviceEvents = (caseData.serviceEvents ?? []).filter((item) => item.serviceKey === serviceKey)
            const addPending = pendingAddKeys.includes(serviceKey)
            const removePending = pendingRemoveKeys.includes(serviceKey)
            const servicePending = addPending || removePending
            const expanded = expandedServiceKey === serviceKey

            return (
              <article className={'case-service-card' + (servicePending ? ' pending' : '')} key={serviceKey}>
                <header className="case-service-card-header">
                  <span className={`case-service-icon service-icon-${serviceKey}`}>{serviceIconLabel(serviceKey)}</span>
                  <div>
                    <h3>{t(`cases.service.${serviceKey}`)}</h3>
                    <p>{t(`cases.serviceGroup.${CASE_SERVICE_GROUPS[serviceKey]}`)}</p>
                    {addPending ? <span className="case-service-pending-badge">{t('cases.services.addPending')}</span> : null}
                    {removePending ? <span className="case-service-pending-badge remove">{t('cases.services.removePending')}</span> : null}
                  </div>
                  <div className="case-service-card-actions">
                    {canCreateEvent && !servicePending ? (
                      <button
                        className="btn-secondary btn-compact"
                        type="button"
                        onClick={() => setExpandedServiceKey(expanded ? null : serviceKey)}
                      >
                        {expanded ? t('cases.services.hideEventPanel') : t('cases.services.createEvent')}
                      </button>
                    ) : null}
                    {canRequestServices && !addPending ? (
                      <button
                        className="btn-secondary btn-compact case-service-remove-btn"
                        type="button"
                        disabled={updateServices.isPending || removePending}
                        onClick={() => setServiceToRemove(serviceKey)}
                      >
                        {removePending ? t('cases.services.removePending') : t('cases.services.removeService')}
                      </button>
                    ) : null}
                  </div>
                </header>

                {expanded ? (
                  <div className="case-service-event-panel">
                    {serviceEvents.length > 0 ? (
                      <div className="case-service-event-list">
                        {serviceEvents.map((item) => (
                          <div className="case-service-event-row" key={item.id}>
                            <div>
                              <strong>{formatDateTime(item.scheduledStart)}</strong>
                              <span>{item.assignedUserName ?? '-'} · {item.location ?? '-'}</span>
                              <span>{item.workDescription ?? '-'}</span>
                              {item.notes ? <span>{t('cases.services.contact')}: {item.notes}</span> : null}
                            </div>
                            <button
                              className="btn-secondary btn-compact"
                              type="button"
                              disabled={deleteEvent.isPending}
                              onClick={() => void deleteEvent.mutateAsync(item.id)}
                            >
                              {t('common.delete')}
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="case-service-empty">{t('cases.services.noEvents')}</p>
                    )}

                    <form className="case-service-event-form" onSubmit={(event) => void submitEvent(event, serviceKey)}>
                      <label>
                        <span>{t('cases.services.assignee')}</span>
                        <select
                          value={draft.assignedUserId}
                          required
                          onChange={(event) => updateEventDraft(serviceKey, { assignedUserId: event.target.value })}
                        >
                          <option value="">{t('cases.services.selectAssignee')}</option>
                          {assignableUsers.map((user) => (
                            <option key={user.id} value={user.id}>{user.fullName}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>{t('cases.services.time')}</span>
                        <input
                          type="datetime-local"
                          value={draft.scheduledStart}
                          required
                          onChange={(event) => updateEventDraft(serviceKey, { scheduledStart: event.target.value })}
                        />
                      </label>
                      <label>
                        <span>{t('cases.services.location')}</span>
                        <input
                          value={draft.location}
                          onChange={(event) => updateEventDraft(serviceKey, { location: event.target.value })}
                        />
                      </label>
                      <label>
                        <span>{t('cases.services.contact')}</span>
                        <input
                          value={draft.contact}
                          onChange={(event) => updateEventDraft(serviceKey, { contact: event.target.value })}
                        />
                      </label>
                      <label className="wide">
                        <span>{t('cases.services.workDescription')}</span>
                        <textarea
                          value={draft.workDescription}
                          required
                          onChange={(event) => updateEventDraft(serviceKey, { workDescription: event.target.value })}
                        />
                      </label>
                      <button className="btn-primary btn-compact" type="submit" disabled={createEvent.isPending}>
                        {createEvent.isPending ? t('common.saving') : t('cases.services.createEvent')}
                      </button>
                    </form>
                  </div>
                ) : null}
              </article>
            )
          })}
        </div>
      ) : (
        <p className="case-placeholder-text">{t('cases.services.empty')}</p>
      )}

      {canRequestServices ? (
        <div className="case-service-request-actions">
          {!showServiceRequest ? (
            <button
              className="btn-primary"
              type="button"
              disabled={availableServiceKeys.length === 0}
              onClick={() => setShowServiceRequest(true)}
            >
              {t('cases.services.applyService')}
            </button>
          ) : null}
        </div>
      ) : null}

      {canRequestServices && showServiceRequest ? (
        <form className="case-event-form case-service-request-form" onSubmit={submitServiceApproval}>
          <h3>{t('cases.services.addService')}</h3>
          <div className="case-form-field">
            <span>{t('cases.services.service')}</span>
            <div className="case-service-check-panel compact">
              {SERVICE_GROUP_KEYS.map((groupKey) => {
                const groupServices = availableServiceKeys.filter((key) => CASE_SERVICE_GROUPS[key] === groupKey)
                if (groupServices.length === 0) return null
                return (
                  <section className="case-service-check-group" key={groupKey}>
                    <h3>{t(`cases.serviceGroup.${groupKey}`)}</h3>
                    <div className="case-service-check-grid">
                      {groupServices.map((key) => (
                        <label className="case-service-check-option" key={key}>
                          <input
                            type="checkbox"
                            checked={servicesToAdd.includes(key)}
                            onChange={(event) => toggleServiceToAdd(key, event.target.checked)}
                          />
                          <span>{t(`cases.service.${key}`)}</span>
                        </label>
                      ))}
                    </div>
                  </section>
                )
              })}
            </div>
          </div>
          <button className="btn-primary" type="submit" disabled={updateServices.isPending || servicesToAdd.length === 0}>
            {updateServices.isPending ? t('common.saving') : t('cases.services.requestService')}
          </button>
          <button
            className="btn-secondary"
            type="button"
            disabled={updateServices.isPending}
            onClick={() => {
              setShowServiceRequest(false)
              setServicesToAdd([])
            }}
          >
            {t('common.cancel')}
          </button>
        </form>
      ) : null}

      {approvedServiceKeys.length > 0 ? (
        <div className="case-service-card-grid">
          {approvedServiceKeys.map((serviceKey) => {
            const draft = eventDrafts[serviceKey] ?? { assignedUserId: '', scheduledStart: '', reportDueAt: '', location: caseData.venue ?? '', workDescription: '', notes: '' }
            const serviceEvents = (caseData.serviceEvents ?? []).filter((item) => item.serviceKey === serviceKey)
            return (
              <article className="case-service-card" key={serviceKey}>
                <header className="case-service-card-header">
                  <span className={`case-service-icon service-icon-${serviceKey}`}>{serviceIconLabel(serviceKey)}</span>
                  <div>
                    <h3>{t(`cases.service.${serviceKey}`)}</h3>
                    <p>{t(`cases.serviceGroup.${CASE_SERVICE_GROUPS[serviceKey]}`)}</p>
                  </div>
                  {canRequestServices ? (
                    <button
                      className="btn-secondary btn-compact case-service-remove-btn"
                      type="button"
                      disabled={updateServices.isPending}
                      onClick={() => setServiceToRemove(serviceKey)}
                    >
                      {t('cases.services.removeService')}
                    </button>
                  ) : null}
                </header>

                {serviceEvents.length > 0 ? (
                  <div className="case-service-event-list">
                    {serviceEvents.map((item) => (
                      <div className="case-service-event-row" key={item.id}>
                        <div>
                          <strong>{formatDateTime(item.scheduledStart)}</strong>
                          <span>{item.assignedUserName ?? '-'} · {item.location ?? '-'}</span>
                          <span>{item.workDescription ?? '-'}</span>
                        </div>
                        <button
                          className="btn-secondary btn-compact"
                          type="button"
                          disabled={deleteEvent.isPending}
                          onClick={() => void deleteEvent.mutateAsync(item.id)}
                        >
                          {t('common.delete')}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="case-service-empty">{t('cases.services.noEvents')}</p>
                )}

                {canCreateEvent ? (
                  <form className="case-service-event-form" onSubmit={(event) => void submitEvent(event, serviceKey)}>
                    <label>
                      <span>{t('cases.services.assignee')}</span>
                      <select
                        value={draft.assignedUserId}
                        required
                        onChange={(event) => updateEventDraft(serviceKey, { assignedUserId: event.target.value })}
                      >
                        <option value="">{t('cases.services.selectAssignee')}</option>
                        {assignableUsers.map((user) => (
                          <option key={user.id} value={user.id}>{user.fullName}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>{t('cases.services.time')}</span>
                      <input
                        type="datetime-local"
                        value={draft.scheduledStart}
                        required
                        onChange={(event) => updateEventDraft(serviceKey, { scheduledStart: event.target.value })}
                      />
                    </label>
                    <label>
                      <span>{t('cases.services.reportDueAt')}</span>
                      <input
                        type="datetime-local"
                        value={draft.reportDueAt}
                        onChange={(event) => updateEventDraft(serviceKey, { reportDueAt: event.target.value })}
                      />
                    </label>
                    <label>
                      <span>{t('cases.services.location')}</span>
                      <input
                        value={draft.location}
                        onChange={(event) => updateEventDraft(serviceKey, { location: event.target.value })}
                      />
                    </label>
                    <label className="wide">
                      <span>{t('cases.services.workDescription')}</span>
                      <textarea
                        value={draft.workDescription}
                        required
                        onChange={(event) => updateEventDraft(serviceKey, { workDescription: event.target.value })}
                      />
                    </label>
                    <label className="wide">
                      <span>{t('cases.services.eventNotes')}</span>
                      <textarea
                        value={draft.notes}
                        onChange={(event) => updateEventDraft(serviceKey, { notes: event.target.value })}
                      />
                    </label>
                    <button className="btn-primary btn-compact" type="submit" disabled={createEvent.isPending}>
                      {createEvent.isPending ? t('common.saving') : t('cases.services.createEvent')}
                    </button>
                  </form>
                ) : null}
              </article>
            )
          })}
        </div>
      ) : (
        <p className="case-placeholder-text">{t('cases.services.empty')}</p>
      )}

      <ApprovalConfirmModal
        open={showServiceApprovalConfirm}
        title={t('approvalConfirm.title')}
        message={t('approvalConfirm.serviceUpdate')}
        confirmLabel={updateServices.isPending ? t('common.saving') : t('approvalConfirm.confirm')}
        cancelLabel={t('approvalConfirm.cancel')}
        pending={updateServices.isPending}
        approverOptions={approvalAssignees.options}
        approverRequired
        approverLoading={approvalAssignees.isLoading}
        onCancel={() => setShowServiceApprovalConfirm(false)}
        onConfirm={(approverId) => void requestAddServices(approverId)}
      />
      <ApprovalConfirmModal
        open={serviceToRemove !== null}
        title={t('approvalConfirm.title')}
        message={t('approvalConfirm.serviceRemove', {
          service: serviceToRemove ? t(`cases.service.${serviceToRemove}`) : '',
        })}
        confirmLabel={updateServices.isPending ? t('common.saving') : t('approvalConfirm.confirm')}
        cancelLabel={t('approvalConfirm.cancel')}
        pending={updateServices.isPending}
        approverOptions={approvalAssignees.options}
        approverRequired
        approverLoading={approvalAssignees.isLoading}
        onCancel={() => setServiceToRemove(null)}
        onConfirm={(approverId) => void requestRemoveService(approverId)}
      />
    </>
  )
}

function serviceIconLabel(serviceKey: keyof CaseServices): string {
  const icons: Record<keyof CaseServices, string> = {
    accommodationArrangement: '⌂',
    deepCleaning: '✦',
    relocationAssistance: '⇄',
    dailyCleaning: '✓',
    pestControl: '!',
    homeRepair: '⌁',
    dailyExpenseSubsidy: '$',
    cpfAssistance: 'CPF',
    mealDelivery: '🍱',
    lunchSupport: '☉',
    monasticSupport: '供',
    monasticEscort: '→',
    legalAid: '§',
    volunteerVisit: '☺',
    digitalSupport: '@',
  }
  return icons[serviceKey]
}

function formatDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function CalendarTab({ caseData }: { caseData: Case }) {
  const { t } = useTranslation()
  const calendarEvents: ServiceCalendarEvent[] = (caseData.serviceEvents ?? []).map((event) => ({
    id: String(event.id),
    title: event.title,
    start: event.scheduledStart,
    extendedProps: {
      serviceType: event.serviceKey,
      note: event.assignedUserName ?? undefined,
    },
  }))

  return (
    <div className="service-calendar-section">
      <div className="case-services-section-title">
        {t('cases.services.calendarTitle')}
      </div>
      <CaseServiceCalendar events={calendarEvents} />
    </div>
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
