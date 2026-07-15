import { type FormEvent, type ReactNode, type SyntheticEvent, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAccess } from '../../../shared/auth/useAccess'
import { useAuth } from '../../../contexts/AuthContext'
import { getApiErrorMessage } from '../../../shared/api'
import { useApprovalAssigneeOptions } from '../../../shared/approvals/useApprovalAssigneeOptions'
import { ApprovalConfirmModal } from '../../../shared/ui'
import { AuditHistoryPanel } from '../../audit-history'
import { useApproveRequest, usePendingApprovals, useRejectRequest, type ApprovalRequest as ServerApprovalRequest } from '../../approvals/api/approval.api'
import { fetchUsers } from '../../users/api/userManagement.api'
import type { UserSummary } from '../../users/types'
import { useUpdateCase, useUpdateCaseServices } from '../hooks'
import type { Case, CaseColorCode, CaseServices, CaseStatus, CaseTask } from '../types'
import { CASE_COLOR_KEYS, CASE_SERVICE_GROUPS, emptyCaseServices } from '../types'
import { CaseDocumentsTab } from './CaseDocumentsTab'
import { CaseReportsTab } from './CaseReportsTab'
import { CaseServiceCalendar } from './CaseServiceCalendar'
import { AddCaseEventForm } from './AddCaseEventForm'
import { CaseIntensityDot } from './CaseIntensityDot'
import { selectedServiceForMode, selectedServicesForMode, type ServiceRequestMode } from './caseServiceRequestUtils'

type TabId = 'overview' | 'services' | 'calendar' | 'documents' | 'reports' | 'audit'

interface TabDef {
  id: TabId
  labelKey: string
  managerOnly?: boolean
  count?: number
}

interface CaseDetailTabsProps {
  caseData: Case
  isManager: boolean
  readOnly?: boolean
}

function activeServiceCount(services: CaseServices): number {
  return Object.values(services).filter(Boolean).length
}

export function CaseDetailTabs({ caseData, isManager, readOnly = false }: CaseDetailTabsProps) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  const serviceCount = activeServiceCount(caseData.services)

  const tabs: TabDef[] = [
    { id: 'overview',   labelKey: 'cases.tab.overview' },
    { id: 'services',   labelKey: 'cases.tab.services',  count: serviceCount },
    { id: 'calendar',   labelKey: 'cases.tab.calendar' },
    { id: 'documents',  labelKey: 'cases.tab.documents' },
    { id: 'reports',    labelKey: 'cases.tab.reports' },
    { id: 'audit',      labelKey: 'cases.tab.audit' },
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
            {tab.count != null && tab.count > 0 ? (
              <span className="case-tab-badge">{tab.count}</span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="case-detail-tab-content">
        {activeTab === 'overview'  ? <OverviewTab  caseData={caseData} readOnly={readOnly} /> : null}
        {activeTab === 'services'  ? <ServicesTab  caseData={caseData} readOnly={readOnly} /> : null}
        {activeTab === 'calendar'  ? <CalendarTab  caseData={caseData} readOnly={readOnly} /> : null}
        {activeTab === 'documents' ? <CaseDocumentsTab caseId={caseData.id} readOnly={readOnly} /> : null}
        {activeTab === 'reports'   ? <CaseReportsTab caseData={caseData} isManager={isManager} readOnly={readOnly} /> : null}
        {activeTab === 'audit'     ? <AuditHistoryPanel caseId={caseData.id} caseCode={caseData.caseNo} /> : null}
      </div>
    </>
  )
}

const INTENSITY_OPTIONS: CaseColorCode[] = ['RED', 'ORANGE', 'YELLOW', 'GREEN', 'GREY']

function OverviewTab({ caseData, readOnly }: { caseData: Case, readOnly: boolean }) {
  const { t } = useTranslation()
  const { resolve } = useAccess()
  const serviceCount = activeServiceCount(caseData.services)

  const canChangeStatus   = resolve('cases:status.close')
  const canAssign         = resolve('cases:assign') || resolve('cases:reassign')
  const canEditIntensity  = resolve('cases:assign')
  const canEdit           = !readOnly && (canChangeStatus || canAssign || canEditIntensity)

  const [status, setStatus] = useState<CaseStatus>(caseData.status)
  const [colorCode, setColorCode] = useState<CaseColorCode>(caseData.colorCode)
  const [savedStatus, setSavedStatus] = useState<CaseStatus>(caseData.status)
  const [savedColorCode, setSavedColorCode] = useState<CaseColorCode>(caseData.colorCode)
  const [savedSocialWorkerId, setSavedSocialWorkerId] = useState(caseData.socialWorkerId ?? '')
  const [savedSocialWorkerName, setSavedSocialWorkerName] = useState(caseData.socialWorker ?? '')
  const [savedComments, setSavedComments] = useState(caseData.comments ?? '')
  const [savedRemarks, setSavedRemarks] = useState(caseData.remarks ?? '')
  const [socialWorkerId, setSocialWorkerId] = useState(caseData.socialWorkerId ?? '')
  const [comments, setComments] = useState(caseData.comments ?? '')
  const [remarks, setRemarks] = useState(caseData.remarks ?? '')
  const [socialWorkers, setSocialWorkers] = useState<UserSummary[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const updateCase = useUpdateCase()

  const isDirty =
    status !== savedStatus ||
    colorCode !== savedColorCode ||
    socialWorkerId !== savedSocialWorkerId ||
    comments !== savedComments ||
    remarks !== savedRemarks

  useEffect(() => {
    if (!canAssign) return
    fetchUsers()
      .then((users) => {
        setSocialWorkers(users.filter((u) => u.roles.includes('SOCIAL_WORKER') && u.status === 'ACTIVE'))
      })
      .catch(() => {})
  }, [canAssign])

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
    setSavedSocialWorkerId(updated.socialWorkerId ?? socialWorkerId)
    setSavedSocialWorkerName(updated.socialWorker || selectedWorker?.fullName || savedSocialWorkerName)
    setSavedComments(updated.comments ?? comments)
    setSavedRemarks(updated.remarks ?? remarks)
    setIsEditing(false)
  }

  function handleCancelEdit() {
    setStatus(savedStatus)
    setColorCode(savedColorCode)
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
          value={canChangeStatus && isEditing ? (
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
          value={canAssign && isEditing ? (
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
        <InfoCell
          label={t('cases.overview.intensity')}
          value={canEditIntensity && isEditing ? (
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
          value={isEditing ? (
            <textarea className="overview-textarea" value={comments} onChange={(e) => setComments(e.target.value)} />
          ) : (
            savedComments || '—'
          )}
          wide
        />
        <InfoCell
          label={t('cases.overview.remarks')}
          value={isEditing ? (
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
          {!isEditing ? (
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
            <button className="btn-secondary" type="button" disabled={updateCase.isPending} onClick={handleCancelEdit}>
              {t('common.cancel')}
            </button>
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

interface PendingApprovalView {
  id: number
  type: string
  targetType?: string | null
  targetId?: number | string | null
  payloadJson?: string | null
  requestedById?: number | null
  requestedByName?: string | null
  assignedApproverId?: number | null
  createdAt?: string | null
}

function uniqueServiceKeys(keys: Array<keyof CaseServices>): Array<keyof CaseServices> {
  return Array.from(new Set(keys))
}

function validServiceKeysFrom(value: unknown): Array<keyof CaseServices> {
  if (!Array.isArray(value)) return []

  const validKeys = new Set(Object.keys(emptyCaseServices()))
  return value.filter((key): key is keyof CaseServices => (
    typeof key === 'string' && validKeys.has(key)
  ))
}

function parsePendingServicePayload(payloadJson?: string | null): PendingServiceChange[] {
  if (!payloadJson) return []

  try {
    const parsed = JSON.parse(payloadJson) as {
      operation?: string
      serviceKeys?: unknown
      addServiceKeys?: unknown
      removeServiceKeys?: unknown
    }

    if (parsed.operation === 'add' || parsed.operation === 'remove') {
      const serviceKeys = validServiceKeysFrom(parsed.serviceKeys)
      return serviceKeys.length > 0 ? [{ operation: parsed.operation, serviceKeys }] : []
    }

    if (parsed.operation === 'update') {
      const addServiceKeys = validServiceKeysFrom(parsed.addServiceKeys)
      const removeServiceKeys = validServiceKeysFrom(parsed.removeServiceKeys)
      return [
        addServiceKeys.length > 0 ? { operation: 'add' as const, serviceKeys: addServiceKeys } : null,
        removeServiceKeys.length > 0 ? { operation: 'remove' as const, serviceKeys: removeServiceKeys } : null,
      ].filter((item): item is PendingServiceChange => item !== null)
    }

    return []
  } catch {
    return []
  }
}

function ServicesTab({ caseData, readOnly }: { caseData: Case, readOnly: boolean }) {
  const { t } = useTranslation()
  const { resolve } = useAccess()
  const { user } = useAuth()
  const [selectedService, setSelectedService] = useState<keyof CaseServices | ''>('')
  const [selectedRemoveServices, setSelectedRemoveServices] = useState<Array<keyof CaseServices>>([])
  const [serviceRequestMode, setServiceRequestMode] = useState<ServiceRequestMode | null>(null)
  const [showServiceApprovalConfirm, setShowServiceApprovalConfirm] = useState(false)
  const [serviceApprovalError, setServiceApprovalError] = useState('')
  const updateServices = useUpdateCaseServices(caseData.id)
  const canRequestServices = !readOnly && resolve('cases:services.create')
  const { data: pendingApprovals = [] } = usePendingApprovals()
  const approveRequest = useApproveRequest()
  const rejectRequest = useRejectRequest()
  const approvalAssignees = useApprovalAssigneeOptions({ allowSelfAssignment: serviceRequestMode === 'add' })

  const approvedServiceKeys = (Object.keys(caseData.services) as Array<keyof CaseServices>).filter((key) => caseData.services[key])
  const serverServiceApprovals = useMemo(() => pendingApprovals.filter((approval) => (
    approval.type === 'CASE_SERVICE_UPDATE' &&
    approval.targetType === 'CASE' &&
    String(approval.targetId) === String(caseData.id)
  )), [caseData.id, pendingApprovals])
  const pendingServiceApprovals = serverServiceApprovals
  const pendingServiceChanges = pendingServiceApprovals
    .filter((approval) => approval.type === 'CASE_SERVICE_UPDATE')
    .flatMap((approval) => parsePendingServicePayload(approval.payloadJson))
  const pendingAddKeys = uniqueServiceKeys(pendingServiceChanges.filter((item) => item.operation === 'add').flatMap((item) => item.serviceKeys))
  const pendingRemoveKeys = uniqueServiceKeys(pendingServiceChanges.filter((item) => item.operation === 'remove').flatMap((item) => item.serviceKeys))
  const displayedServiceKeys = uniqueServiceKeys([...approvedServiceKeys, ...pendingAddKeys])
  const availableServiceKeys = (Object.keys(caseData.services) as Array<keyof CaseServices>)
    .filter((key) => !caseData.services[key] && !pendingAddKeys.includes(key))
  const removableServiceKeys = displayedServiceKeys.filter((key) => !pendingRemoveKeys.includes(key))
  const selectedServiceChanges = serviceRequestMode === 'add'
    ? selectedServiceForMode(serviceRequestMode, selectedService)
    : serviceRequestMode === 'remove'
      ? selectedServicesForMode(serviceRequestMode, selectedRemoveServices)
    : { servicesToAdd: [], servicesToRemove: [] }
  const activeServicesToAdd = selectedServiceChanges.servicesToAdd
  const activeServicesToRemove = selectedServiceChanges.servicesToRemove

  function pendingApprovalForService(serviceKey: keyof CaseServices, operation: 'add' | 'remove') {
    return pendingServiceApprovals.find((approval) => (
      parsePendingServicePayload(approval.payloadJson).some((change) => (
        change.operation === operation && change.serviceKeys.includes(serviceKey)
      ))
    ))
  }

  async function decideServiceApproval(approval: ServerApprovalRequest, approved: boolean) {
    if (!resolve('approvals:decide')) return
    if (!canDecideServiceApproval(approval, user?.id)) return
    if (approved) {
      await approveRequest.mutateAsync({ id: approval.id, data: {} })
      return
    }
    await rejectRequest.mutateAsync({ id: approval.id, data: {} })
  }

  function openServiceRequest(mode: ServiceRequestMode) {
    setSelectedService('')
    setSelectedRemoveServices([])
    setServiceApprovalError('')
    setServiceRequestMode(mode)
  }

  function toggleRemoveService(serviceKey: keyof CaseServices) {
    if (serviceRequestMode !== 'remove' || !removableServiceKeys.includes(serviceKey)) return
    setSelectedRemoveServices((current) => (
      current.includes(serviceKey)
        ? current.filter((key) => key !== serviceKey)
        : [...current, serviceKey]
    ))
  }

  function submitServiceApproval(event?: FormEvent<HTMLFormElement> | SyntheticEvent) {
    event?.preventDefault()
    if (!serviceRequestMode || (activeServicesToAdd.length === 0 && activeServicesToRemove.length === 0)) return
    setServiceApprovalError('')
    setShowServiceApprovalConfirm(true)
  }

  async function requestServiceChanges(approverId?: number, reason?: string) {
    if (!serviceRequestMode || (activeServicesToAdd.length === 0 && activeServicesToRemove.length === 0)) return
    setServiceApprovalError('')
    try {
      const currentRequestedServices = uniqueServiceKeys([...approvedServiceKeys, ...pendingAddKeys])
        .filter((key) => !pendingRemoveKeys.includes(key))
      const nextServices = uniqueServiceKeys([...currentRequestedServices, ...activeServicesToAdd])
        .filter((key) => !activeServicesToRemove.includes(key))
      await updateServices.mutateAsync({ services: nextServices, approverId, reason })
      setSelectedService('')
      setSelectedRemoveServices([])
      setServiceRequestMode(null)
      setShowServiceApprovalConfirm(false)
    } catch (error) {
      setServiceApprovalError(getApiErrorMessage(error) ?? t('cases.services.approvalSubmitError'))
    }
  }

  return (
    <>
      <section className="case-service-panel">
        {displayedServiceKeys.length > 0 ? (
          <div className="case-service-card-grid">
            {displayedServiceKeys.map((serviceKey) => {
              const addPending = pendingAddKeys.includes(serviceKey)
              const removePending = pendingRemoveKeys.includes(serviceKey)
              const servicePending = addPending || removePending
              const pendingOperation = addPending ? 'add' : removePending ? 'remove' : null
              const pendingApproval = pendingOperation ? pendingApprovalForService(serviceKey, pendingOperation) : undefined
              const serverPendingApproval = pendingApproval
                ? serverServiceApprovals.find((approval) => approval.id === pendingApproval.id)
                : undefined
              const canDecidePendingApproval = resolve('approvals:decide') && canDecideServiceApproval(serverPendingApproval, user?.id)
              const canSelectForRemoval = serviceRequestMode === 'remove' && removableServiceKeys.includes(serviceKey)
              const isSelectedForRemoval = selectedRemoveServices.includes(serviceKey)

              return (
                <article
                  className={
                    'case-service-card'
                    + (servicePending ? ' pending' : '')
                    + (canSelectForRemoval ? ' selectable-remove' : '')
                    + (isSelectedForRemoval ? ' selected-remove' : '')
                  }
                  key={serviceKey}
                >
                  <header
                    className="case-service-card-header"
                    onClick={() => canSelectForRemoval ? toggleRemoveService(serviceKey) : undefined}
                  >
                    {canSelectForRemoval ? (
                      <input
                        className="case-service-remove-checkbox"
                        type="checkbox"
                        checked={isSelectedForRemoval}
                        onChange={() => toggleRemoveService(serviceKey)}
                        onClick={(event) => event.stopPropagation()}
                        aria-label={t('cases.services.selectServiceToRemove')}
                      />
                    ) : null}
                    <span className={`case-service-icon service-icon-${serviceKey}`}>{serviceIconLabel(serviceKey)}</span>
                    <div>
                      <h3>{t(`cases.service.${serviceKey}`)}</h3>
                      <p>{t(`cases.serviceGroup.${CASE_SERVICE_GROUPS[serviceKey]}`)}</p>
                      {addPending ? <span className="case-service-pending-badge">{t('cases.services.addPending')}</span> : null}
                      {removePending ? <span className="case-service-pending-badge remove">{t('cases.services.removePending')}</span> : null}
                    </div>
                  </header>

                  {pendingApproval ? (
                    <ServiceApprovalSummary
                      approval={pendingApproval}
                      serverApproval={serverPendingApproval}
                      canDecideApproval={canDecidePendingApproval}
                      deciding={approveRequest.isPending || rejectRequest.isPending}
                      onApprove={() => serverPendingApproval ? void decideServiceApproval(serverPendingApproval, true) : undefined}
                      onReject={() => serverPendingApproval ? void decideServiceApproval(serverPendingApproval, false) : undefined}
                    />
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
            <div className="case-service-action-left">
              {serviceRequestMode === 'remove' ? (
                <>
                  <button className="btn-primary" type="button" disabled={updateServices.isPending || activeServicesToRemove.length === 0} onClick={submitServiceApproval}>
                    {updateServices.isPending ? t('common.saving') : t('cases.services.requestService')}
                  </button>
                  <button
                    className="btn-secondary"
                    type="button"
                    disabled={updateServices.isPending}
                    onClick={() => {
                      setServiceRequestMode(null)
                      setSelectedRemoveServices([])
                    }}
                  >
                    {t('common.cancel')}
                  </button>
                </>
              ) : !serviceRequestMode ? (
                <button
                  className="btn-secondary case-service-action-button"
                  type="button"
                  disabled={removableServiceKeys.length === 0}
                  onClick={() => openServiceRequest('remove')}
                >
                  {t('cases.services.removeService')}
                </button>
              ) : null}
            </div>
            <div className="case-service-action-right">
              {!serviceRequestMode ? (
                <button
                  className="btn-secondary case-service-action-button"
                  type="button"
                  disabled={availableServiceKeys.length === 0}
                  onClick={() => openServiceRequest('add')}
                >
                  {t('cases.services.addService')}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {canRequestServices && serviceRequestMode === 'add' ? (
          <form className="case-event-form case-service-request-form single" onSubmit={submitServiceApproval}>
            <h3>{t('cases.services.addService')}</h3>
            <label className="case-form-field case-service-request-field">
              <span>{t('cases.services.selectServiceToAdd')}</span>
              <select
                className="overview-select case-service-request-select"
                value={selectedService}
                onChange={(event) => setSelectedService(event.target.value as keyof CaseServices | '')}
              >
                <option value="">{t('cases.services.selectPlaceholder')}</option>
                {SERVICE_GROUP_KEYS.map((groupKey) => {
                  const groupServices = availableServiceKeys.filter((key) => CASE_SERVICE_GROUPS[key] === groupKey)
                  if (groupServices.length === 0) return null
                  return (
                    <optgroup key={groupKey} label={t(`cases.serviceGroup.${groupKey}`)}>
                      {groupServices.map((key) => (
                        <option key={key} value={key}>{t(`cases.service.${key}`)}</option>
                      ))}
                    </optgroup>
                  )
                })}
              </select>
              {availableServiceKeys.length === 0 ? (
                <span className="case-service-empty">
                  {t('cases.services.noAvailableServices')}
                </span>
              ) : null}
            </label>
            <div className="case-service-request-submit-row">
              <button className="btn-primary" type="submit" disabled={updateServices.isPending || (activeServicesToAdd.length === 0 && activeServicesToRemove.length === 0)}>
                {updateServices.isPending ? t('common.saving') : t('cases.services.requestService')}
              </button>
              <button
                className="btn-secondary"
                type="button"
                disabled={updateServices.isPending}
                onClick={() => {
                  setServiceRequestMode(null)
                  setSelectedService('')
                  setSelectedRemoveServices([])
                }}
              >
                {t('common.cancel')}
              </button>
            </div>
          </form>
        ) : null}
      </section>

      <ApprovalConfirmModal
        open={showServiceApprovalConfirm}
        title={t('approvalConfirm.title')}
        message={t('approvalConfirm.serviceUpdate')}
        confirmLabel={updateServices.isPending ? t('common.saving') : t('approvalConfirm.confirm')}
        cancelLabel={t('approvalConfirm.cancel')}
        pending={updateServices.isPending}
        error={serviceApprovalError}
        approverOptions={approvalAssignees.options}
        approverRequired
        approverLoading={approvalAssignees.isLoading}
        onCancel={() => {
          setServiceApprovalError('')
          setShowServiceApprovalConfirm(false)
        }}
        onConfirm={(approverId, reason) => void requestServiceChanges(approverId, reason)}
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

function ServiceApprovalSummary({
  approval,
  serverApproval,
  canDecideApproval,
  deciding,
  onApprove,
  onReject,
}: {
  approval: PendingApprovalView
  serverApproval?: ServerApprovalRequest
  canDecideApproval: boolean
  deciding: boolean
  onApprove: () => void
  onReject: () => void
}) {
  const { t } = useTranslation()
  const reason = approvalReason(approval.payloadJson)

  return (
    <div className="case-service-approval-summary">
      <dl>
        <div>
          <dt>{t('approvals.fields.requestedBy')}</dt>
          <dd>{approval.requestedByName ?? '-'}</dd>
        </div>
        <div>
          <dt>{t('approvals.fields.createdAt')}</dt>
          <dd>{formatDateTime(approval.createdAt)}</dd>
        </div>
      </dl>
      <details className="case-approval-reason">
        <summary>{t('cases.approvals.reason')}</summary>
        <p>{reason || t('cases.approvals.noReason')}</p>
      </details>
      {serverApproval && canDecideApproval ? (
        <div className="case-service-approval-actions">
          <button className="btn-secondary btn-compact" type="button" disabled={deciding} onClick={onReject}>
            {t('approvals.reject')}
          </button>
          <button className="btn-primary btn-compact" type="button" disabled={deciding} onClick={onApprove}>
            {t('approvals.approve')}
          </button>
        </div>
      ) : null}
    </div>
  )
}

function canDecideServiceApproval(
  approval: Pick<PendingApprovalView, 'type' | 'requestedById' | 'assignedApproverId' | 'payloadJson'> | undefined,
  currentUserId: number | undefined,
) {
  if (!approval || currentUserId === undefined) return false
  if (approval.requestedById === currentUserId) {
    return approval.assignedApproverId === currentUserId && isSelfDecidableServiceAddApproval(approval)
  }
  return approval.assignedApproverId == null || approval.assignedApproverId === currentUserId
}

function isSelfDecidableServiceAddApproval(
  approval: Pick<PendingApprovalView, 'type' | 'payloadJson'>,
): boolean {
  if (approval.type !== 'CASE_SERVICE_UPDATE') return false
  const changes = parsePendingServicePayload(approval.payloadJson)
  return changes.length > 0 && changes.every((change) => change.operation === 'add')
}

function approvalReason(payloadJson?: string | null): string {
  if (!payloadJson) return ''
  try {
    const parsed = JSON.parse(payloadJson) as { _approval?: { reason?: unknown } }
    return typeof parsed._approval?.reason === 'string' ? parsed._approval.reason.trim() : ''
  } catch {
    return ''
  }
}

function formatDateTime(value?: string | null): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function CalendarTab({ caseData, readOnly }: { caseData: Case, readOnly: boolean }) {
  const { t } = useTranslation()
  const [showAddEvent, setShowAddEvent] = useState(false)

  return (
    <div className="service-calendar-section">
      <div className="case-services-section-title">
        {t('cases.services.calendarTitle')}
      </div>
      <CaseServiceCalendar caseData={caseData} readOnly={readOnly} />

      {!readOnly ? (
        <div className="calendar-add-event-bar">
          <button
            className="btn-primary"
            type="button"
            onClick={() => setShowAddEvent((open) => !open)}
          >
            + {t('cases.services.addCalendarEvent')}
          </button>
        </div>
      ) : null}

      {showAddEvent && !readOnly ? (
        <AddCaseEventForm caseData={caseData} onDone={() => setShowAddEvent(false)} />
      ) : null}
    </div>
  )
}

