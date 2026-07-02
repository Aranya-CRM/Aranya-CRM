import type { PersonalCalendarEvent } from '../types'

/**
 * 直接调用 Google Calendar REST API 读取当前用户「主日历(primary)」在 [from, to] 区间的事件。
 * 用 GIS 拿到的 access token 鉴权;仅只读展示,不写、不落库。
 * 失败(令牌失效/网络)时返回空数组,安全降级不阻断日历渲染。
 */

interface GoogleEventDateTime {
  dateTime?: string
  date?: string
}

interface GoogleEvent {
  id: string
  summary?: string
  location?: string
  description?: string
  start?: GoogleEventDateTime
  end?: GoogleEventDateTime
}

interface GoogleEventsResponse {
  items?: GoogleEvent[]
}

export async function fetchPersonalEvents(
  accessToken: string,
  fromIso: string,
  toIso: string,
): Promise<PersonalCalendarEvent[]> {
  const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events')
  url.searchParams.set('timeMin', fromIso)
  url.searchParams.set('timeMax', toIso)
  url.searchParams.set('singleEvents', 'true')
  url.searchParams.set('orderBy', 'startTime')
  url.searchParams.set('maxResults', '250')

  try {
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) {
      console.warn('[personalCalendar] Google Calendar API returned', res.status)
      return []
    }
    const data = (await res.json()) as GoogleEventsResponse
    return (data.items ?? []).map((item) => ({
      id: item.id,
      title: item.summary ?? null,
      start: item.start?.dateTime ?? item.start?.date ?? null,
      end: item.end?.dateTime ?? item.end?.date ?? null,
      allDay: Boolean(item.start?.date),
      location: item.location ?? null,
      description: item.description ?? null,
    }))
  } catch (e) {
    console.warn('[personalCalendar] fetch failed', e)
    return []
  }
}
