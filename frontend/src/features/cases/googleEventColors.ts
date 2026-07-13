/**
 * Google Calendar 事件调色板:colorId("1"-"11") → 色值。
 *
 * 数据来源:Google Calendar API 的 `GET /calendar/v3/colors` 响应里的 `event` 分组
 * (另一个分组 `calendar` 是日历自身的默认色,不适用于单个事件)。该端点返回的
 * background/foreground 即 Google 客户端渲染事件所用的实际色值。
 *
 * 校准方式(调色板极少变动,但如需核对或 Google 调整后刷新):
 *   curl -H "Authorization: Bearer $TOKEN" https://www.googleapis.com/calendar/v3/colors
 * 取响应中的 `event` 对象覆盖下表即可 —— 键名和结构与此处完全一致。
 *
 * 注意:只有在 Google 日历里被手动改过颜色的事件才带 colorId;未改过的事件 colorId 为空,
 * 继承所属日历的默认色,而日历默认色是 per-user 的 calendarList 属性,service account 读不到。
 * 因此空 colorId 一律回退到我们自己按来源区分的默认色(evt-other / evt-external)。
 */
export interface GoogleEventColor {
  /** Google 官方色名,仅用于可读性/图例 */
  name: string
  /** 事件底色 */
  background: string
  /** 该底色上的文字色 */
  foreground: string
}

export const GOOGLE_EVENT_COLORS: Record<string, GoogleEventColor> = {
  '1':  { name: 'Lavender',  background: '#a4bdfc', foreground: '#1d1d1d' },
  '2':  { name: 'Sage',      background: '#7ae7bf', foreground: '#1d1d1d' },
  '3':  { name: 'Grape',     background: '#dbadff', foreground: '#1d1d1d' },
  '4':  { name: 'Flamingo',  background: '#ff887c', foreground: '#1d1d1d' },
  '5':  { name: 'Banana',    background: '#fbd75b', foreground: '#1d1d1d' },
  '6':  { name: 'Tangerine', background: '#ffb878', foreground: '#1d1d1d' },
  '7':  { name: 'Peacock',   background: '#46d6db', foreground: '#1d1d1d' },
  '8':  { name: 'Graphite',  background: '#e1e1e1', foreground: '#1d1d1d' },
  '9':  { name: 'Blueberry', background: '#5484ed', foreground: '#1d1d1d' },
  '10': { name: 'Basil',     background: '#51b749', foreground: '#1d1d1d' },
  '11': { name: 'Tomato',    background: '#dc2127', foreground: '#1d1d1d' },
}

/** colorId 为空/未知时返回 undefined,调用方回退到按来源区分的默认色 */
export function googleEventColor(colorId?: string | null): GoogleEventColor | undefined {
  if (!colorId) return undefined
  return GOOGLE_EVENT_COLORS[colorId]
}
