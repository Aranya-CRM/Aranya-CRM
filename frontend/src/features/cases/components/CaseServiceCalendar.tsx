import { useEffect, useMemo, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import type { DatesSetArg, EventClickArg } from '@fullcalendar/core'
import zhCnLocale from '@fullcalendar/core/locales/zh-cn'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { Case, ServiceCalendarEvent, ServiceEvent } from '../types'
import { fetchCalendarOptions, fetchSharedCalendarEvents } from '../api/case.api'
import { fetchPersonalEvents } from '../api/personalCalendar.api'
import { useDeleteServiceEvent, useSyncServiceEvent } from '../hooks'
import { useGoogleCalendar } from '../hooks/useGoogleCalendar'
import { AddCaseEventForm } from './AddCaseEventForm'
import { EventDetailModal, type EventDetail } from './EventDetailModal'

const HIDDEN_SHARED_KEY = 'aranya.cal.hiddenShared'
const PERSONAL_HIDDEN_KEY = 'aranya.cal.personalHidden'

function loadHiddenShared(): string[] {
  try {
    const raw = localStorage.getItem(HIDDEN_SHARED_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

interface Props {
  caseData: Case
}

/** 把 Date 格式化成不带时区偏移的本地 ISO(后端按 Asia/Singapore 解析为 LocalDateTime) */
function toLocalIso(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

export function CaseServiceCalendar({ caseData }: Props) {
  const caseId = caseData.id
  const localEvents = caseData.serviceEvents ?? []
  const { i18n, t } = useTranslation()
  const [range, setRange] = useState<{ from: string; to: string; googleFrom: string; googleTo: string } | null>(null)
  const [selected, setSelected] = useState<EventDetail | null>(null)
  const [editing, setEditing] = useState<ServiceEvent | null>(null)
  const [hiddenShared, setHiddenShared] = useState<string[]>(loadHiddenShared)
  const [personalHidden, setPersonalHidden] = useState<boolean>(() => localStorage.getItem(PERSONAL_HIDDEN_KEY) === '1')
  const deleteEvent = useDeleteServiceEvent(caseId)
  const syncEvent = useSyncServiceEvent(caseId)
  const gcal = useGoogleCalendar()

  useEffect(() => { localStorage.setItem(HIDDEN_SHARED_KEY, JSON.stringify(hiddenShared)) }, [hiddenShared])
  useEffect(() => { localStorage.setItem(PERSONAL_HIDDEN_KEY, personalHidden ? '1' : '0') }, [personalHidden])

  const { data: sharedEvents = [] } = useQuery({
    queryKey: ['caseSharedCalendar', caseId, range?.from, range?.to],
    queryFn: () => fetchSharedCalendarEvents(caseId, range!.from, range!.to),
    enabled: range !== null,
    staleTime: 60_000,
  })

  // 个人日历(方案 A):以用户身份直连 Google 读 primary,只读叠加
  const { data: personalEvents = [] } = useQuery({
    queryKey: ['casePersonalCalendar', range?.googleFrom, range?.googleTo, gcal.connected],
    queryFn: async () => {
      const token = await gcal.getToken()
      if (!token) return []
      return fetchPersonalEvents(token, range!.googleFrom, range!.googleTo)
    },
    enabled: gcal.available && gcal.connected && !personalHidden && range !== null,
    staleTime: 60_000,
  })

  // 集成是否启用:有可写日历即视为启用(用于决定是否展示「未同步」告警)
  const { data: calendarOptions = [] } = useQuery({
    queryKey: ['calendarOptions'],
    queryFn: fetchCalendarOptions,
    staleTime: 5 * 60_000,
  })
  const syncEnabled = calendarOptions.length > 0

  function toggleShared(id: string, checked: boolean) {
    setHiddenShared((prev) => (checked ? prev.filter((x) => x !== id) : prev.includes(id) ? prev : [...prev, id]))
  }

  // id → 详情 的查找表(供 eventClick 用)
  const detailById = useMemo(() => {
    const map = new Map<string, EventDetail>()
    localEvents.forEach((ev) => {
      map.set(String(ev.id), {
        id: String(ev.id),
        kind: 'OWN',
        title: ev.title,
        start: ev.scheduledStart,
        end: ev.scheduledEnd,
        source: 'OWN_CASE',
        serviceName: ev.serviceName,
        assignedUserName: ev.assignedUserName,
        location: ev.location,
        agenda: ev.agenda,
        schedule: ev.schedule,
        address: ev.address,
        manpower: ev.manpower,
        instructions: ev.instructions,
        reportDueAt: ev.reportDueAt,
        localId: ev.id,
        synced: ev.synced,
      })
    })
    sharedEvents.forEach((ev) => {
      map.set(`g-${ev.id}`, {
        id: `g-${ev.id}`,
        kind: 'SHARED',
        title: ev.title ?? '(untitled)',
        start: ev.start,
        end: ev.end,
        source: ev.source,
        location: ev.location,
        description: ev.description,
        calendarName: ev.calendarName,
      })
    })
    personalEvents.forEach((ev) => {
      map.set(`p-${ev.id}`, {
        id: `p-${ev.id}`,
        kind: 'SHARED',
        title: ev.title ?? '(untitled)',
        start: ev.start,
        end: ev.end,
        source: 'PERSONAL',
        location: ev.location,
        description: ev.description,
        calendarName: t('cases.services.myCalendar'),
      })
    })
    return map
  }, [localEvents, sharedEvents, personalEvents, t])

  const ownColored: ServiceCalendarEvent[] = localEvents.map((ev) => ({
    id: String(ev.id),
    title: ev.title,
    start: ev.scheduledStart,
    // 月视图里不传 end:每个事件只占开始日格子,避免跨天事件横跨多列溢出(时长见详情弹窗)
    classNames: syncEnabled && ev.synced === false ? ['evt-own', 'evt-unsynced'] : ['evt-own'],
    extendedProps: { source: 'OWN_CASE' },
  }))

  const sharedColored: ServiceCalendarEvent[] = sharedEvents
    .filter((ev) => ev.start && (!ev.calendarId || !hiddenShared.includes(ev.calendarId)))
    .map((ev) => ({
      id: `g-${ev.id}`,
      title: ev.title ?? '(untitled)',
      start: ev.start as string,
      classNames: [ev.source === 'EXTERNAL' ? 'evt-external' : 'evt-other'],
      extendedProps: { source: ev.source },
    }))

  const personalColored: ServiceCalendarEvent[] = personalEvents
    .filter((ev) => ev.start)
    .map((ev) => ({
      id: `p-${ev.id}`,
      title: ev.title ?? '(untitled)',
      start: ev.start as string,
      classNames: ['evt-personal'],
      extendedProps: { source: 'PERSONAL' },
    }))

  const events = [...ownColored, ...sharedColored, ...personalColored]

  function handleDatesSet(arg: DatesSetArg) {
    setRange({
      from: toLocalIso(arg.start),
      to: toLocalIso(arg.end),
      googleFrom: arg.start.toISOString(),
      googleTo: arg.end.toISOString(),
    })
  }

  function handleEventClick(arg: EventClickArg) {
    const detail = detailById.get(arg.event.id)
    if (detail) setSelected(detail)
  }

  async function handleDelete(localId: number) {
    await deleteEvent.mutateAsync(localId)
    setSelected(null)
  }

  function handleEdit(localId: number) {
    const ev = localEvents.find((e) => e.id === localId)
    if (ev) {
      setSelected(null)
      setEditing(ev)
    }
  }

  function handleSync(localId: number) {
    void syncEvent.mutateAsync(localId).then(() => setSelected(null))
  }

  const showPersonalControls = gcal.available

  return (
    <div className="service-calendar-wrap">
      <div className="calendar-filter-bar">
        <span className="calendar-filter-label">{t('cases.services.filterLabel')}</span>
        {calendarOptions.map((opt) => (
          <label key={opt.id} className="calendar-filter-item">
            <input
              type="checkbox"
              checked={!hiddenShared.includes(opt.id)}
              onChange={(e) => toggleShared(opt.id, e.target.checked)}
            />
            <span>{opt.name}</span>
          </label>
        ))}
        {showPersonalControls ? (
          gcal.connected ? (
            <>
              <label className="calendar-filter-item">
                <input
                  type="checkbox"
                  checked={!personalHidden}
                  onChange={(e) => setPersonalHidden(!e.target.checked)}
                />
                <span>{t('cases.services.myCalendar')}</span>
              </label>
              <button type="button" className="btn-link-action" onClick={gcal.disconnect}>
                {t('cases.services.disconnect')}
              </button>
            </>
          ) : (
            <button type="button" className="btn-link-action" onClick={gcal.connect}>
              {t('cases.services.connectGoogle')}
            </button>
          )
        ) : null}
      </div>

      <FullCalendar
        plugins={[dayGridPlugin]}
        initialView="dayGridMonth"
        locale={i18n.language === 'zh' ? zhCnLocale : 'en'}
        firstDay={0}
        events={events}
        height="auto"
        eventDisplay="block"
        dayMaxEvents={4}
        fixedWeekCount={false}
        datesSet={handleDatesSet}
        eventClick={handleEventClick}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: '',
        }}
      />
      <div className="calendar-legend">
        <span className="calendar-legend-item"><i className="lg-own" />{t('cases.services.legendOwn')}</span>
        <span className="calendar-legend-item"><i className="lg-other" />{t('cases.services.legendOther')}</span>
        <span className="calendar-legend-item"><i className="lg-external" />{t('cases.services.legendExternal')}</span>
        {gcal.available && gcal.connected ? (
          <span className="calendar-legend-item"><i className="lg-personal" />{t('cases.services.legendPersonal')}</span>
        ) : null}
      </div>

      {events.length === 0 && (
        <p className="service-calendar-placeholder">
          {t('cases.services.calendarPlaceholder')}
        </p>
      )}

      {selected ? (
        <EventDetailModal
          detail={selected}
          onClose={() => setSelected(null)}
          onEdit={handleEdit}
          onDelete={(id) => void handleDelete(id)}
          onSync={handleSync}
          deleting={deleteEvent.isPending}
          syncing={syncEvent.isPending}
          syncEnabled={syncEnabled}
        />
      ) : null}

      {editing ? (
        <AddCaseEventForm caseData={caseData} event={editing} onDone={() => setEditing(null)} />
      ) : null}
    </div>
  )
}
