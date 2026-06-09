import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import zhCnLocale from '@fullcalendar/core/locales/zh-cn'
import { useTranslation } from 'react-i18next'
import type { ServiceCalendarEvent } from '../types'

interface Props {
  events: ServiceCalendarEvent[]
}

export function CaseServiceCalendar({ events }: Props) {
  const { i18n, t } = useTranslation()

  return (
    <div className="service-calendar-wrap">
      <FullCalendar
        plugins={[dayGridPlugin]}
        initialView="dayGridMonth"
        locale={i18n.language === 'zh' ? zhCnLocale : 'en'}
        events={events}
        height="auto"
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
