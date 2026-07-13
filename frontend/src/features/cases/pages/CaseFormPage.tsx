import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ApprovalConfirmModal, BackButton, ErrorBanner, PageHeader, SectionCard } from '../../../shared/ui'
import { useApprovalAssigneeOptions } from '../../../shared/approvals/useApprovalAssigneeOptions'
import { fetchClientsAvailableForCase } from '../../clients/api/client.api'
import type { Client } from '../../clients/types'
import { fetchUsers } from '../../users/api/userManagement.api'
import type { UserSummary } from '../../users/types'
import { useCreateCase } from '../hooks'
import { CASE_COLOR_KEYS, CASE_SERVICE_GROUPS, emptyCaseServices, type CaseColorCode, type CaseServices, type CaseStatus } from '../types'
import { CaseIntensityDot } from '../components/CaseIntensityDot'
import './cases.css'

const STATUS_OPTIONS: CaseStatus[] = ['OPEN', 'SUSPENDED', 'CLOSED']
const COLOR_OPTIONS: CaseColorCode[] = ['RED', 'ORANGE', 'YELLOW', 'GREEN', 'GREY']
const SERVICE_GROUP_KEYS = ['housing', 'financial', 'food', 'other'] as const

export function CaseFormPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const requestedClientId = searchParams.get('clientId') ?? ''
  const createCase = useCreateCase()
  const approvalAssignees = useApprovalAssigneeOptions({ allowSelfAssignment: true })
  const [clients, setClients] = useState<Client[]>([])
  const [socialWorkers, setSocialWorkers] = useState<UserSummary[]>([])
  const [clientId, setClientId] = useState(requestedClientId)
  const [socialWorkerId, setSocialWorkerId] = useState('')
  const [openedAt, setOpenedAt] = useState(new Date().toISOString().slice(0, 10))
  const [status, setStatus] = useState<CaseStatus>('OPEN')
  const [colorCode, setColorCode] = useState<CaseColorCode>('GREEN')
  const [comments, setComments] = useState('')
  const [remarks, setRemarks] = useState('')
  const [services, setServices] = useState<CaseServices>(emptyCaseServices())
  const [serviceToAdd, setServiceToAdd] = useState<keyof CaseServices | ''>('')
  const [errorMessage, setErrorMessage] = useState<string>()
  const [showApprovalConfirm, setShowApprovalConfirm] = useState(false)

  useEffect(() => {
    setClientId(requestedClientId)
  }, [requestedClientId])

  useEffect(() => {
    let active = true

    void fetchClientsAvailableForCase()
      .then((clientData) => {
        if (!active) return
        setClients(clientData)
        if (requestedClientId && !clientData.some((client) => client.id === requestedClientId)) {
          setErrorMessage(t('cases.form.clientUnavailable'))
        }
      })
      .catch(() => {
        if (active) setErrorMessage(t('cases.form.loadError'))
      })

    void fetchUsers()
      .then((userData) => {
        if (!active) return
        setSocialWorkers(userData.filter((user) => user.status === 'ACTIVE' && user.roles.includes('SOCIAL_WORKER')))
      })
      .catch(() => {
        if (active) setSocialWorkers([])
      })

    return () => {
      active = false
    }
  }, [requestedClientId, t])

  const selectedServices = useMemo(
    () => (Object.keys(services) as Array<keyof CaseServices>).filter((key) => services[key]),
    [services],
  )
  const availableServiceKeys = useMemo(
    () => (Object.keys(services) as Array<keyof CaseServices>).filter((key) => !services[key]),
    [services],
  )

  function addService(serviceKey: keyof CaseServices | '') {
    setServiceToAdd('')
    if (!serviceKey) return
    setServices((current) => ({ ...current, [serviceKey]: true }))
  }

  function removeService(serviceKey: keyof CaseServices) {
    setServices((current) => ({ ...current, [serviceKey]: false }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!clientId) return
    setErrorMessage(undefined)
    if (selectedServices.length === 0) {
      setErrorMessage(t('cases.form.serviceRequired'))
      return
    }
    setShowApprovalConfirm(true)
  }

  async function submitApproval(approverId?: number, reason?: string) {
    if (!clientId || selectedServices.length === 0) return
    setErrorMessage(undefined)
    try {
      await createCase.mutateAsync({
        approverId,
        reason,
        data: {
          clientId,
          socialWorkerId: socialWorkerId || undefined,
          openedAt,
          status,
          colorCode,
          comments,
          remarks,
          services: selectedServices,
        },
      })
      setShowApprovalConfirm(false)
      navigate('/cases')
    } catch {
      setErrorMessage(t('cases.form.saveError'))
    }
  }

  return (
    <div className="case-page">
      <BackButton onClick={() => navigate('/cases')} />
      <PageHeader title={t('cases.form.newCase')} />
      {errorMessage ? <ErrorBanner message={errorMessage} /> : null}
      <form className="case-form-stack case-create-form" onSubmit={(event) => void handleSubmit(event)}>
        <SectionCard title={t('cases.form.coreInfo')} bodyPadding>
          <div className="case-form-grid">
            <label className="case-form-field">
              <span>{t('cases.form.client')} *</span>
              <select required value={clientId} onChange={(event) => setClientId(event.target.value)}>
                <option value="">{t('cases.form.selectClient')}</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>{client.abbr} - {client.nameEn}</option>
                ))}
              </select>
            </label>
            <label className="case-form-field">
              <span>{t('cases.form.openedAt')} *</span>
              <input required type="date" value={openedAt} onChange={(event) => setOpenedAt(event.target.value)} />
            </label>
            <label className="case-form-field">
              <span>{t('cases.form.caseworker')}</span>
              <select value={socialWorkerId} onChange={(event) => setSocialWorkerId(event.target.value)}>
                <option value="">{t('cases.form.unassigned')}</option>
                {socialWorkers.map((worker) => (
                  <option key={worker.id} value={worker.id}>{worker.fullName}</option>
                ))}
              </select>
            </label>
            <label className="case-form-field">
              <span>{t('cases.form.status')} *</span>
              <select required value={status} onChange={(event) => setStatus(event.target.value as CaseStatus)}>
                {STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
            <label className="case-form-field wide">
              <span>{t('cases.form.comments')}</span>
              <textarea value={comments} onChange={(event) => setComments(event.target.value)} />
            </label>
            <label className="case-form-field wide">
              <span>{t('cases.form.remarks')}</span>
              <textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} />
            </label>
          </div>
        </SectionCard>

        <SectionCard title={t('cases.form.intensity')} bodyPadding>
          <div className="case-form-intensity-field">
            <div className="case-form-select-with-dot">
              <CaseIntensityDot colorCode={colorCode} />
              <select
                aria-label={t('cases.form.intensity')}
                required
                value={colorCode}
                onChange={(event) => setColorCode(event.target.value as CaseColorCode)}
              >
                {COLOR_OPTIONS.map((option) => (
                  <option key={option} value={option}>{t(CASE_COLOR_KEYS[option])}</option>
                ))}
              </select>
            </div>
          </div>
        </SectionCard>

        <SectionCard title={t('cases.form.services')} bodyPadding>
          <div className="case-create-service-layout">
            <label className="case-form-field">
              <span>{t('cases.services.selectServiceToAdd')} *</span>
              <select
                value={serviceToAdd}
                onChange={(event) => addService(event.target.value as keyof CaseServices | '')}
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
              <span className="case-form-helper">{t('cases.form.serviceRequired')}</span>
            </label>

            <div className="case-create-selected-services">
              <span className="case-create-selected-title">{t('cases.form.selectedServices')}</span>
              <div className="case-service-selected-row">
                {selectedServices.length === 0 ? (
                  <span className="case-form-helper">{t('cases.form.noSelectedServices')}</span>
                ) : selectedServices.map((key) => (
                  <button key={key} className="case-service-chip removable" type="button" onClick={() => removeService(key)}>
                    {t(`cases.service.${key}`)}
                    <span aria-hidden="true">x</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="case-create-service-groups">
            {SERVICE_GROUP_KEYS.map((groupKey) => {
              const groupServices = selectedServices.filter((key) => CASE_SERVICE_GROUPS[key] === groupKey)
              if (groupServices.length === 0) return null
              return (
                <section className="case-create-service-group" key={groupKey}>
                  <h3>{t(`cases.serviceGroup.${groupKey}`)}</h3>
                  <div>
                    {groupServices.map((key) => (
                      <span key={key}>{t(`cases.service.${key}`)}</span>
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        </SectionCard>

        <div className="case-form-actions">
          <button className="btn-secondary" type="button" onClick={() => navigate('/cases')}>
            {t('common.cancel')}
          </button>
          <button className="btn-primary" type="submit" disabled={!clientId || createCase.isPending}>
            {createCase.isPending
              ? t('cases.form.submittingApproval')
              : t('cases.form.submitForApproval')}
          </button>
        </div>
      </form>
      <ApprovalConfirmModal
        open={showApprovalConfirm}
        title={t('approvalConfirm.title')}
        message={t('approvalConfirm.caseCreate')}
        confirmLabel={createCase.isPending ? t('cases.form.submittingApproval') : t('approvalConfirm.confirm')}
        cancelLabel={t('approvalConfirm.cancel')}
        pending={createCase.isPending}
        approverOptions={approvalAssignees.options}
        approverRequired
        approverLoading={approvalAssignees.isLoading}
        onCancel={() => setShowApprovalConfirm(false)}
        onConfirm={(approverId, reason) => void submitApproval(approverId, reason)}
      />
    </div>
  )
}
