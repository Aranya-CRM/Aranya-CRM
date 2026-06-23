import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchUsers } from '../../users/api/userManagement.api'
import type { UserSummary } from '../../users/types'
import { useCreateServiceEvent } from '../hooks'
import type { Case, CaseServices } from '../types'

interface Props {
  caseData: Case
  onDone: () => void
}

/** 「增添事件」卡片弹窗 —— 按组织日历模板采集字段,创建后镜像到 Google 共享日历。 */
export function AddCaseEventForm({ caseData, onDone }: Props) {
  const { t } = useTranslation()
  const createEvent = useCreateServiceEvent(caseData.id)

  const selectedServiceKeys = useMemo(
    () => (Object.keys(caseData.services) as Array<keyof CaseServices>).filter((key) => caseData.services[key]),
    [caseData.services],
  )

  const [serviceKey, setServiceKey] = useState<keyof CaseServices | ''>(selectedServiceKeys[0] ?? '')
  const [assignedUserId, setAssignedUserId] = useState('')
  const [scheduledStart, setScheduledStart] = useState('')
  const [scheduledEnd, setScheduledEnd] = useState('')
  const [location, setLocation] = useState('')
  const [address, setAddress] = useState('')
  const [agenda, setAgenda] = useState('')
  const [schedule, setSchedule] = useState('')
  const [manpower, setManpower] = useState('')
  const [instructions, setInstructions] = useState('')
  const [users, setUsers] = useState<UserSummary[]>([])
  const [formError, setFormError] = useState<string>()

  useEffect(() => {
    fetchUsers()
      .then((list) => setUsers(list.filter((u) => u.status === 'ACTIVE')))
      .catch(() => {})
  }, [])

  const serviceLabel = serviceKey ? t(`cases.service.${serviceKey}`) : ''
  const titlePreview = serviceKey
    ? `${serviceLabel}: ${caseData.clientAbbr ?? ''}${location.trim() ? ` @ ${location.trim()}` : ''}`
    : ''

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(undefined)
    if (!serviceKey || !scheduledStart) {
      setFormError(t('cases.services.requiredFields'))
      return
    }
    try {
      await createEvent.mutateAsync({
        serviceKey,
        assignedUserId: assignedUserId || undefined,
        scheduledStart,
        scheduledEnd: scheduledEnd || undefined,
        location: location.trim() || undefined,
        address: address.trim() || undefined,
        agenda: agenda.trim() || undefined,
        schedule: schedule.trim() || undefined,
        manpower: manpower.trim() || undefined,
        instructions: instructions.trim() || undefined,
      })
      onDone()
    } catch {
      setFormError(t('cases.services.createError'))
    }
  }

  return (
    <div className="event-modal-backdrop" role="presentation" onMouseDown={onDone}>
      <form
        className="event-modal"
        onMouseDown={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <header className="event-modal-header">
          <h2>{t('cases.services.addCalendarEvent')}</h2>
          <button type="button" className="event-modal-close" aria-label="Close" onClick={onDone}>×</button>
        </header>

        <div className="event-modal-body">
          <div className="event-form-grid">
            <label>
              <span>{t('cases.services.service')}</span>
              <select value={serviceKey} required onChange={(e) => setServiceKey(e.target.value as keyof CaseServices)}>
                <option value="">{t('cases.services.selectService')}</option>
                {selectedServiceKeys.map((key) => (
                  <option key={key} value={key}>{t(`cases.service.${key}`)}</option>
                ))}
              </select>
            </label>

            <label>
              <span>{t('cases.services.assignee')}</span>
              <select value={assignedUserId} onChange={(e) => setAssignedUserId(e.target.value)}>
                <option value="">{t('cases.services.selectAssignee')}</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.fullName}</option>
                ))}
              </select>
            </label>

            <label>
              <span>{t('cases.services.time')}</span>
              <input type="datetime-local" value={scheduledStart} required onChange={(e) => setScheduledStart(e.target.value)} />
            </label>

            <label>
              <span>{t('cases.services.endTime')}</span>
              <input type="datetime-local" value={scheduledEnd} onChange={(e) => setScheduledEnd(e.target.value)} />
            </label>

            <label className="wide">
              <span>{t('cases.services.location')}</span>
              <input
                value={location}
                placeholder="Hong Yi TCM"
                onChange={(e) => setLocation(e.target.value)}
              />
            </label>

            {titlePreview ? (
              <div className="wide event-title-preview">
                <span>{t('cases.services.titlePreview')}</span>
                <strong>{titlePreview}</strong>
              </div>
            ) : null}

            <label className="wide">
              <span>{t('cases.services.agenda')}</span>
              <textarea className="ta-sm" value={agenda} onChange={(e) => setAgenda(e.target.value)} />
            </label>

            <label className="wide">
              <span>{t('cases.services.schedule')}</span>
              <textarea
                className="ta-lg"
                value={schedule}
                placeholder={'0930hrs Pickup @ vihara\n1030hrs Appointment @ clinic\n1130hrs Return to vihara'}
                onChange={(e) => setSchedule(e.target.value)}
              />
            </label>

            <label className="wide">
              <span>{t('cases.services.address')}</span>
              <textarea
                className="ta-lg"
                value={address}
                placeholder={'Clinic: ...\nVihara: ...'}
                onChange={(e) => setAddress(e.target.value)}
              />
            </label>

            <label className="wide">
              <span>{t('cases.services.manpower')}</span>
              <textarea
                className="ta-lg"
                value={manpower}
                placeholder={'Medical Kappiya:\nMedical Caseworker:\nMedical Transport:'}
                onChange={(e) => setManpower(e.target.value)}
              />
            </label>

            <label className="wide">
              <span>{t('cases.services.instructions')}</span>
              <textarea className="ta-lg" value={instructions} onChange={(e) => setInstructions(e.target.value)} />
            </label>

            {formError ? <div className="wide case-form-error">{formError}</div> : null}
          </div>
        </div>

        <footer className="event-modal-footer">
          <button className="btn-secondary" type="button" disabled={createEvent.isPending} onClick={onDone}>
            {t('common.cancel')}
          </button>
          <button className="btn-primary" type="submit" disabled={createEvent.isPending}>
            {createEvent.isPending ? t('common.saving') : t('cases.services.createEvent')}
          </button>
        </footer>
      </form>
    </div>
  )
}
