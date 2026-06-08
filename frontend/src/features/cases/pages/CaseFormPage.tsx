import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { BackButton, ErrorBanner, PageHeader, SectionCard } from '../../../shared/ui'
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
  const createCase = useCreateCase()
  const [clients, setClients] = useState<Client[]>([])
  const [socialWorkers, setSocialWorkers] = useState<UserSummary[]>([])
  const [clientId, setClientId] = useState('')
  const [socialWorkerId, setSocialWorkerId] = useState('')
  const [openedAt, setOpenedAt] = useState(new Date().toISOString().slice(0, 10))
  const [status, setStatus] = useState<CaseStatus>('OPEN')
  const [colorCode, setColorCode] = useState<CaseColorCode>('GREEN')
  const [comments, setComments] = useState('')
  const [remarks, setRemarks] = useState('')
  const [services, setServices] = useState<CaseServices>(emptyCaseServices())
  const [errorMessage, setErrorMessage] = useState<string>()

  useEffect(() => {
    void Promise.all([fetchClientsWithoutCase(), fetchUsers()])
      .then(([clientData, userData]) => {
        setClients(clientData)
        setSocialWorkers(userData.filter((user) => user.status === 'ACTIVE' && user.roles.includes('SOCIAL_WORKER')))
      })
      .catch(() => setErrorMessage(t('cases.form.loadError')))
  }, [t])

  const selectedServices = useMemo(
    () => (Object.keys(services) as Array<keyof CaseServices>).filter((key) => services[key]),
    [services],
  )

  function toggleService(key: keyof CaseServices) {
    setServices((current) => ({ ...current, [key]: !current[key] }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!clientId) return
    setErrorMessage(undefined)
    try {
      const created = await createCase.mutateAsync({
        clientId,
        socialWorkerId: socialWorkerId || undefined,
        openedAt,
        status,
        colorCode,
        comments,
        remarks,
        services: selectedServices,
      })
      navigate(`/cases/${created.id}`)
    } catch {
      setErrorMessage(t('cases.form.saveError'))
    }
  }

  return (
    <div className="case-page">
      <BackButton onClick={() => navigate('/cases')} />
      <PageHeader title={t('cases.form.newCase')} />
      {errorMessage ? <ErrorBanner message={errorMessage} /> : null}
      <form className="case-form-stack" onSubmit={(event) => void handleSubmit(event)}>
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
          <div className="case-form-color-grid">
            {COLOR_OPTIONS.map((option) => (
              <label key={option} className="case-form-color-option">
                <input type="radio" checked={colorCode === option} onChange={() => setColorCode(option)} />
                <span>{t(CASE_COLOR_KEYS[option])}</span>
              </label>
            ))}
          </div>
        </SectionCard>

        <SectionCard title={t('cases.form.services')} bodyPadding>
          {SERVICE_GROUP_KEYS.map((groupKey) => {
            const items = (Object.keys(CASE_SERVICE_GROUPS) as Array<keyof CaseServices>).filter(
              (key) => CASE_SERVICE_GROUPS[key] === groupKey,
            )
            return (
              <div className="case-form-service-group" key={groupKey}>
                <h3>{t(`cases.serviceGroup.${groupKey}`)}</h3>
                <div className="case-services-grid">
                  {items.map((key) => (
                    <label key={key} className="case-services-item">
                      <input
                        type="checkbox"
                        className="service-check"
                        checked={services[key]}
                        onChange={() => toggleService(key)}
                      />
                      {t(`cases.service.${key}`)}
                    </label>
                  ))}
                </div>
              </div>
            )
          })}
        </SectionCard>

        <div className="case-form-actions">
          <button className="btn-secondary" type="button" onClick={() => navigate('/cases')}>
            {t('common.cancel')}
          </button>
          <button className="btn-primary" type="submit" disabled={!clientId || createCase.isPending}>
            {createCase.isPending ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </form>
    </div>
  )
}
