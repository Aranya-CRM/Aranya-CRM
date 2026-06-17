import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ApprovalConfirmModal, BackButton, ErrorBanner, PageHeader, SectionCard } from '../../../shared/ui'
import { fetchClientsWithoutCase } from '../../clients/api/client.api'
import type { Client } from '../../clients/types'
import { fetchUsers } from '../../users/api/userManagement.api'
import type { UserSummary } from '../../users/types'
import { useCreateCase } from '../hooks'
import { CASE_COLOR_KEYS, CASE_SERVICE_GROUPS, emptyCaseServices, type CaseColorCode, type CaseServices, type CaseStatus } from '../types'
import './cases.css'

const STATUS_OPTIONS: CaseStatus[] = ['OPEN', 'SUSPENDED', 'CLOSED']
const COLOR_OPTIONS: CaseColorCode[] = ['RED', 'ORANGE', 'YELLOW', 'GREEN', 'GREY', 'BLACK']
const SERVICE_GROUP_KEYS = ['housing', 'financial', 'food', 'other'] as const

export function CaseFormPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const requestedClientId = searchParams.get('clientId') ?? ''
  const createCase = useCreateCase()
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
  const [errorMessage, setErrorMessage] = useState<string>()
  const [successMessage, setSuccessMessage] = useState<string>()
  const [submittedApprovalId, setSubmittedApprovalId] = useState<number>()
  const [showApprovalConfirm, setShowApprovalConfirm] = useState(false)
  const approvalSubmitted = submittedApprovalId !== undefined

  useEffect(() => {
    setClientId(requestedClientId)
  }, [requestedClientId])

  useEffect(() => {
    let active = true

    void fetchClientsWithoutCase()
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!clientId || approvalSubmitted) return
    setErrorMessage(undefined)
    setSuccessMessage(undefined)
    if (selectedServices.length === 0) {
      setErrorMessage(t('cases.form.serviceRequired'))
      return
    }
    setShowApprovalConfirm(true)
  }

  async function submitApproval() {
    if (!clientId || approvalSubmitted || selectedServices.length === 0) return
    setErrorMessage(undefined)
    setSuccessMessage(undefined)
    try {
      const approval = await createCase.mutateAsync({
        clientId,
        socialWorkerId: socialWorkerId || undefined,
        openedAt,
        status,
        colorCode,
        comments,
        remarks,
        services: selectedServices,
      })
      setSubmittedApprovalId(approval.id)
      setSuccessMessage(t('cases.form.approvalSubmittedWithId', { id: approval.id }))
      setShowApprovalConfirm(false)
    } catch {
      setErrorMessage(t('cases.form.saveError'))
    }
  }

  return (
    <div className="case-page">
      <BackButton onClick={() => navigate('/cases')} />
      <PageHeader title={t('cases.form.newCase')} />
      {errorMessage ? <ErrorBanner message={errorMessage} /> : null}
      {successMessage ? <div className="case-profile-loading">{successMessage}</div> : null}
      <form className="case-form-stack" onSubmit={(event) => void handleSubmit(event)}>
        <SectionCard title={t('cases.form.coreInfo')} bodyPadding>
          <div className="case-form-grid">
            <label className="case-form-field">
              <span>{t('cases.form.client')} *</span>
              <select required value={clientId} disabled={approvalSubmitted} onChange={(event) => setClientId(event.target.value)}>
                <option value="">{t('cases.form.selectClient')}</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>{client.abbr} - {client.nameEn}</option>
                ))}
              </select>
            </label>
            <label className="case-form-field">
              <span>{t('cases.form.openedAt')} *</span>
              <input required type="date" value={openedAt} disabled={approvalSubmitted} onChange={(event) => setOpenedAt(event.target.value)} />
            </label>
            <label className="case-form-field">
              <span>{t('cases.form.caseworker')}</span>
              <select value={socialWorkerId} disabled={approvalSubmitted} onChange={(event) => setSocialWorkerId(event.target.value)}>
                <option value="">{t('cases.form.unassigned')}</option>
                {socialWorkers.map((worker) => (
                  <option key={worker.id} value={worker.id}>{worker.fullName}</option>
                ))}
              </select>
            </label>
            <label className="case-form-field">
              <span>{t('cases.form.status')} *</span>
              <select required value={status} disabled={approvalSubmitted} onChange={(event) => setStatus(event.target.value as CaseStatus)}>
                {STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
            <label className="case-form-field wide">
              <span>{t('cases.form.comments')}</span>
              <textarea value={comments} disabled={approvalSubmitted} onChange={(event) => setComments(event.target.value)} />
            </label>
            <label className="case-form-field wide">
              <span>{t('cases.form.remarks')}</span>
              <textarea value={remarks} disabled={approvalSubmitted} onChange={(event) => setRemarks(event.target.value)} />
            </label>
          </div>
        </SectionCard>

        <SectionCard title={t('cases.form.intensity')} bodyPadding>
          <div className="case-form-color-grid">
            {COLOR_OPTIONS.map((option) => (
              <label key={option} className="case-form-color-option">
                <input type="radio" checked={colorCode === option} disabled={approvalSubmitted} onChange={() => setColorCode(option)} />
                <span>{t(CASE_COLOR_KEYS[option])}</span>
              </label>
            ))}
          </div>
        </SectionCard>

        <SectionCard title={t('cases.form.services')} bodyPadding>
          <div className="case-form-field">
            <span>{t('cases.form.services')} *</span>
            <div className="case-service-check-panel">
              {SERVICE_GROUP_KEYS.map((groupKey) => {
                const groupServices = (Object.keys(CASE_SERVICE_GROUPS) as Array<keyof CaseServices>)
                  .filter((key) => CASE_SERVICE_GROUPS[key] === groupKey)
                return (
                  <section className="case-service-check-group" key={groupKey}>
                    <h3>{t(`cases.serviceGroup.${groupKey}`)}</h3>
                    <div className="case-service-check-grid">
                      {groupServices.map((key) => (
                        <label className="case-service-check-option" key={key}>
                          <input
                            type="checkbox"
                            checked={services[key]}
                            disabled={approvalSubmitted}
                            onChange={(event) => {
                              const checked = event.target.checked
                              setServices((current) => ({ ...current, [key]: checked }))
                            }}
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
          <div className="case-service-selected-row">
            {selectedServices.length === 0 ? (
              <span>{t('cases.form.serviceRequired')}</span>
            ) : selectedServices.map((key) => (
              <span key={key} className="case-service-chip">{t(`cases.service.${key}`)}</span>
            ))}
          </div>
        </SectionCard>

        <div className="case-form-actions">
          <button className="btn-secondary" type="button" onClick={() => navigate('/cases')}>
            {t('common.cancel')}
          </button>
          <button className="btn-primary" type="submit" disabled={!clientId || createCase.isPending || approvalSubmitted}>
            {approvalSubmitted
              ? t('cases.form.approvalSubmittedButton')
              : createCase.isPending
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
        onCancel={() => setShowApprovalConfirm(false)}
        onConfirm={() => void submitApproval()}
      />
    </div>
  )
}
