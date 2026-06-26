import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { fetchUsers } from '../../users/api/userManagement.api'
import type { UserSummary } from '../../users/types'
import { fetchCalendarOptions } from '../api/case.api'
import { useCreateServiceEvent, useUpdateServiceEvent } from '../hooks'
import type { Case, CaseServices, ServiceEvent } from '../types'

interface Props {
  caseData: Case
  /** 传入则进入编辑模式,预填该事件并改走更新接口 */
  event?: ServiceEvent
  onDone: () => void
}

/** datetime-local 需要 `YYYY-MM-DDTHH:mm`;后端返回的 ISO 串裁到分钟即可。 */
function toLocalInput(value?: string | null): string {
  return value ? value.slice(0, 16) : ''
}

/** 「增添/编辑事件」卡片弹窗 —— 按组织日历模板采集字段,创建/更新后镜像到 Google 共享日历。 */
export function AddCaseEventForm({ caseData, event, onDone }: Props) {
  const { t } = useTranslation()
  const isEdit = event != null
  const createEvent = useCreateServiceEvent(caseData.id)
  const updateEvent = useUpdateServiceEvent(caseData.id)
  const pending = createEvent.isPending || updateEvent.isPending

  const selectedServiceKeys = useMemo(
    () => (Object.keys(caseData.services) as Array<keyof CaseServices>).filter((key) => caseData.services[key]),
    [caseData.services],
  )

  const { data: calendarOptions = [] } = useQuery({
    queryKey: ['calendarOptions'],
    queryFn: fetchCalendarOptions,
    staleTime: 5 * 60_000,
  })

  const [serviceKey, setServiceKey] = useState<keyof CaseServices | ''>(event?.serviceKey ?? selectedServiceKeys[0] ?? '')
  const [calendarId, setCalendarId] = useState('')
  const [assignedUserId, setAssignedUserId] = useState(event?.assignedUserId != null ? String(event.assignedUserId) : '')
  const [scheduledStart, setScheduledStart] = useState(toLocalInput(event?.scheduledStart))
  const [scheduledEnd, setScheduledEnd] = useState(toLocalInput(event?.scheduledEnd))
  const [location, setLocation] = useState(event?.location ?? '')
  const [address, setAddress] = useState(event?.address ?? '')
  const [agenda, setAgenda] = useState(event?.agenda ?? '')
  const [schedule, setSchedule] = useState(event?.schedule ?? '')
  const [manpower, setManpower] = useState(event?.manpower ?? '')
  const [instructions, setInstructions] = useState(event?.instructions ?? '')
  const [users, setUsers] = useState<UserSummary[]>([])
  const [formError, setFormError] = useState<string>()

  useEffect(() => {
    fetchUsers()
      .then((list) => setUsers(list.filter((u) => u.status === 'ACTIVE')))
      .catch(() => {})
  }, [])

  // 日历选项加载后:编辑模式预选事件原日历,否则选默认日历
  useEffect(() => {
    if (!calendarId && calendarOptions.length > 0) {
      const current = isEdit && event?.googleCalendarId
        ? calendarOptions.find((c) => c.id === event.googleCalendarId)
        : undefined
      const def = current ?? calendarOptions.find((c) => c.isDefault) ?? calendarOptions[0]
      setCalendarId(def.id)
    }
  }, [calendarOptions, calendarId, isEdit, event])

  const serviceLabel = serviceKey ? t(`cases.service.${serviceKey}`) : ''
  const seqPrefix = event?.eventSeq != null ? `${String(event.eventSeq).padStart(3, '0')} ` : ''
  const titlePreview = serviceKey
    ? `${seqPrefix}${serviceLabel}: ${caseData.clientAbbr ?? ''}${location.trim() ? ` @ ${location.trim()}` : ''}`
    : ''

  async function submit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()
    setFormError(undefined)
    if (!serviceKey || !scheduledStart) {
      setFormError(t('cases.services.requiredFields'))
      return
    }
    // 结束时间不得早于开始时间
    if (scheduledEnd && scheduledEnd < scheduledStart) {
      setFormError(t('cases.services.endBeforeStart'))
      return
    }
    const payload = {
      serviceKey,
      calendarId: calendarId || undefined,
      assignedUserId: assignedUserId || undefined,
      scheduledStart,
      scheduledEnd: scheduledEnd || undefined,
      location: location.trim() || undefined,
      address: address.trim() || undefined,
      agenda: agenda.trim() || undefined,
      schedule: schedule.trim() || undefined,
      manpower: manpower.trim() || undefined,
      instructions: instructions.trim() || undefined,
    }
    try {
      if (isEdit && event) {
        await updateEvent.mutateAsync({ eventId: event.id, data: payload })
      } else {
        await createEvent.mutateAsync(payload)
      }
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
          <h2>{isEdit ? t('cases.services.editEvent') : t('cases.services.addCalendarEvent')}</h2>
          <button type="button" className="event-modal-close" aria-label="Close" onClick={onDone}>×</button>
        </header>

        <div className="event-modal-body">
          <div className="event-form-grid">
            {calendarOptions.length > 0 ? (
              <label className="wide">
                <span>{t('cases.services.calendar')}</span>
                <select value={calendarId} onChange={(e) => setCalendarId(e.target.value)}>
                  {calendarOptions.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}{c.isDefault ? ` (${t('cases.services.calendarDefault')})` : ''}</option>
                  ))}
                </select>
              </label>
            ) : null}

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
              <span>{t('cases.services.time')} {t('cases.services.timezoneHint')}</span>
              <input type="datetime-local" value={scheduledStart} required onChange={(e) => setScheduledStart(e.target.value)} />
            </label>

            <label>
              <span>{t('cases.services.endTime')} {t('cases.services.timezoneHint')}</span>
              <input type="datetime-local" value={scheduledEnd} min={scheduledStart || undefined} onChange={(e) => setScheduledEnd(e.target.value)} />
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
          <button className="btn-secondary" type="button" disabled={pending} onClick={onDone}>
            {t('common.cancel')}
          </button>
          <button className="btn-primary" type="submit" disabled={pending}>
            {pending ? t('common.saving') : isEdit ? t('common.save') : t('cases.services.createEvent')}
          </button>
        </footer>
      </form>
    </div>
  )
}
