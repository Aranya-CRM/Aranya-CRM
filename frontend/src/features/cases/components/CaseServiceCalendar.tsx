import { useMemo, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import type { DatesSetArg, EventClickArg } from '@fullcalendar/core'
import zhCnLocale from '@fullcalendar/core/locales/zh-cn'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { Case, ServiceCalendarEvent, ServiceEvent } from '../types'
import { fetchCalendarOptions, fetchSharedCalendarEvents } from '../api/case.api'
import { useDeleteServiceEvent, useSyncServiceEvent } from '../hooks'
import { AddCaseEventForm } from './AddCaseEventForm'
import { EventDetailModal, type EventDetail } from './EventDetailModal'

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
  const [range, setRange] = useState<{ from: string; to: string } | null>(null)
  const [selected, setSelected] = useState<EventDetail | null>(null)
  const [editing, setEditing] = useState<ServiceEvent | null>(null)
  const deleteEvent = useDeleteServiceEvent(caseId)
  const syncEvent = useSyncServiceEvent(caseId)

  const { data: sharedEvents = [] } = useQuery({
    queryKey: ['caseSharedCalendar', caseId, range?.from, range?.to],
    queryFn: () => fetchSharedCalendarEvents(caseId, range!.from, range!.to),
    enabled: range !== null,
    staleTime: 60_000,
  })

  // 集成是否启用:有可写日历即视为启用(用于决定是否展示「未同步」告警)
  const { data: calendarOptions = [] } = useQuery({
    queryKey: ['calendarOptions'],
    queryFn: fetchCalendarOptions,
    staleTime: 5 * 60_000,
  })
  const syncEnabled = calendarOptions.length > 0

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
    return map
  }, [localEvents, sharedEvents])

  const ownColored: ServiceCalendarEvent[] = localEvents.map((ev) => ({
    id: String(ev.id),
    title: ev.title,
    start: ev.scheduledStart,
    // 月视图里不传 end:每个事件只占开始日格子,避免跨天事件横跨多列溢出(时长见详情弹窗)
    classNames: syncEnabled && ev.synced === false ? ['evt-own', 'evt-unsynced'] : ['evt-own'],
    extendedProps: { source: 'OWN_CASE' },
  }))

  const sharedColored: ServiceCalendarEvent[] = sharedEvents
    .filter((ev) => ev.start)
    .map((ev) => ({
      id: `g-${ev.id}`,
      title: ev.title ?? '(untitled)',
      start: ev.start as string,
      classNames: [ev.source === 'EXTERNAL' ? 'evt-external' : 'evt-other'],
      extendedProps: { source: ev.source },
    }))

  const events = [...ownColored, ...sharedColored]

  function handleDatesSet(arg: DatesSetArg) {
    setRange({ from: toLocalIso(arg.start), to: toLocalIso(arg.end) })
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

  return (
    <div className="service-calendar-wrap">
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
