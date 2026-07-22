import {
  isTokenValid,
  loadCachedToken,
  requestGoogleToken,
  saveCachedToken,
  type GoogleToken,
} from './googleAuth'

const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly'
const STORAGE_KEY = 'life-dashboard:google-calendar-token'

export interface CalendarEvent {
  id: string
  title: string
  start: Date
  allDay: boolean
  // YYYY-MM-DD in the event's own calendar day — used to place it on a
  // month grid without timezone-shift surprises from parsing all-day dates.
  dateKey: string
}

interface CalendarApiEvent {
  id: string
  summary?: string
  start?: { dateTime?: string; date?: string }
}

let cachedToken: GoogleToken | null = loadCachedToken(STORAGE_KEY)

async function getToken(): Promise<string> {
  if (isTokenValid(cachedToken)) return cachedToken.accessToken
  cachedToken = await requestGoogleToken(CALENDAR_SCOPE)
  saveCachedToken(STORAGE_KEY, cachedToken)
  return cachedToken.accessToken
}

export function hasValidCalendarToken(): boolean {
  return isTokenValid(cachedToken)
}

export function toDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Fetches every event in the calendar month containing `monthDate`, for
// plotting on a month-grid view.
export async function fetchMonthEvents(monthDate: Date): Promise<CalendarEvent[]> {
  const token = await getToken()
  const rangeStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
  const rangeEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1)

  const params = new URLSearchParams({
    timeMin: rangeStart.toISOString(),
    timeMax: rangeEnd.toISOString(),
    maxResults: '250',
    singleEvents: 'true',
    orderBy: 'startTime',
  })

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${token}` } },
  )

  if (!res.ok) {
    throw new Error(`Calendar API error: ${res.status}`)
  }

  const data = (await res.json()) as { items?: CalendarApiEvent[] }
  return (data.items ?? []).map((item) => {
    const allDay = !item.start?.dateTime
    const start = new Date(item.start?.dateTime ?? item.start?.date ?? Date.now())
    return {
      id: item.id,
      title: item.summary ?? '(no title)',
      start,
      allDay,
      dateKey: allDay && item.start?.date ? item.start.date : toDateKey(start),
    }
  })
}
