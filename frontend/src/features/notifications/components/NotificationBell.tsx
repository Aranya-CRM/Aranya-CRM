import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  type EventNotification,
} from '../api/notification.api'

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </svg>
  )
}

export function NotificationBell() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const { data: notifications = [], isLoading } = useNotifications()
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()
  const unreadCount = notifications.filter((item) => !item.readAt).length

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [])

  function openEvent(notification: EventNotification) {
    if (!notification.readAt) {
      markRead.mutate(notification.id)
    }
    setOpen(false)
    navigate(`/reports/${notification.eventId}`)
  }

  function formatDeadline(value: string): string {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return new Intl.DateTimeFormat(i18n.language, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date)
  }

  return (
    <div className="notification-center" ref={rootRef}>
      <button
        className="notification-bell"
        type="button"
        aria-label={t('notifications.title')}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <BellIcon />
        {unreadCount > 0 ? (
          <span className="notification-count">{unreadCount > 99 ? '99+' : unreadCount}</span>
        ) : null}
      </button>

      {open ? (
        <section className="notification-popover" aria-label={t('notifications.title')}>
          <header className="notification-popover-header">
            <strong>{t('notifications.title')}</strong>
            {unreadCount > 0 ? (
              <button type="button" onClick={() => markAllRead.mutate()}>
                {t('notifications.markAllRead')}
              </button>
            ) : null}
          </header>

          <div className="notification-list">
            {isLoading ? (
              <p className="notification-empty">{t('common.loading')}</p>
            ) : notifications.length === 0 ? (
              <p className="notification-empty">{t('notifications.empty')}</p>
            ) : notifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                className={'notification-item' + (!notification.readAt ? ' unread' : '')}
                onClick={() => openEvent(notification)}
              >
                <span className="notification-item-title">
                  {t('notifications.overdueTitle', { eventId: notification.eventId })}
                </span>
                <span className="notification-item-body">
                  {t('notifications.overdueBody', {
                    deadline: formatDeadline(notification.deadline),
                  })}
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
