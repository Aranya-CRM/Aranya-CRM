import { useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import type { DatesSetArg } from '@fullcalendar/core'
import zhCnLocale from '@fullcalendar/core/locales/zh-cn'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { ServiceCalendarEvent } from '../types'
import { fetchSharedCalendarEvents } from '../api/case.api'

interface Props {
  caseId: string
  /** 本 case 自己的事件(本地真相源) */
  localEvents: ServiceCalendarEvent[]
}

// 配色对应规范第六节:Case 事件紫色,共享日历其他来源用绿色区分
const OWN_CASE_COLORS = { backgroundColor: '#ede7f6', borderColor: '#d7c8f0', textColor: '#4527a0' }
const OTHER_CASE_COLORS = { backgroundColor: '#f3effb', borderColor: '#e0d6f5', textColor: '#6a4fb3' }
const EXTERNAL_COLORS = { backgroundColor: '#e8f5e9', borderColor: '#a5d6a7', textColor: '#2e7d32' }

/** 把 Date 格式化成不带时区偏移的本地 ISO(后端按 Asia/Singapore 解析为 LocalDateTime) */
function toLocalIso(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

export function CaseServiceCalendar({ caseId, localEvents }: Props) {
  const { i18n, t } = useTranslation()
  const [range, setRange] = useState<{ from: string; to: string } | null>(null)

  const { data: sharedEvents = [] } = useQuery({
    queryKey: ['caseSharedCalendar', caseId, range?.from, range?.to],
    queryFn: () => fetchSharedCalendarEvents(caseId, range!.from, range!.to),
    enabled: range !== null,
    staleTime: 60_000,
  })

  const ownColored: ServiceCalendarEvent[] = localEvents.map((event) => ({
    ...event,
    ...OWN_CASE_COLORS,
    extendedProps: { ...event.extendedProps, source: 'OWN_CASE' },
  }))

  const sharedColored: ServiceCalendarEvent[] = sharedEvents
    .filter((event) => event.start)
    .map((event) => ({
      id: `g-${event.id}`,
      title: event.title ?? '(untitled)',
      start: event.start as string,
      end: event.end ?? undefined,
      ...(event.source === 'EXTERNAL' ? EXTERNAL_COLORS : OTHER_CASE_COLORS),
      extendedProps: { source: event.source },
    }))

  const events = [...ownColored, ...sharedColored]

  function handleDatesSet(arg: DatesSetArg) {
    setRange({ from: toLocalIso(arg.start), to: toLocalIso(arg.end) })
  }

  return (
    <div className="service-calendar-wrap">
      <FullCalendar
        plugins={[dayGridPlugin]}
        initialView="dayGridMonth"
        locale={i18n.language === 'zh' ? zhCnLocale : 'en'}
        events={events}
        height="auto"
        datesSet={handleDatesSet}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: '',
        }}
      />
      {events.length === 0 && (
        <p className="service-calendar-placeholder">
          {t('cases.services.calendarPlaceholder')}
        </p>
      )}
    </div>
  )
}
