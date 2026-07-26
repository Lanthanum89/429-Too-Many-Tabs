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
  htmlLink: string
}

interface CalendarApiEvent {
  id: string
  summary?: string
  start?: { dateTime?: string; date?: string }
  htmlLink?: string
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

async function fetchEventsInRange(rangeStart: Date, rangeEnd: Date): Promise<CalendarEvent[]> {
  const token = await getToken()

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
      htmlLink: item.htmlLink ?? 'https://calendar.google.com/calendar/r',
    }
  })
}

// Fetches every event in the `days`-day span starting on `from`'s calendar
// day, regardless of where that day falls in the Mon-Sun week - a fixed
// Monday-first week range used to cut this off at the following Sunday,
// so events later in the same rolling window (e.g. Monday's events when
// `from` is a Sunday) never got fetched at all.
export async function fetchUpcomingEvents(from: Date, days: number): Promise<CalendarEvent[]> {
  const rangeStart = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const rangeEnd = new Date(rangeStart)
  rangeEnd.setDate(rangeEnd.getDate() + days)
  return fetchEventsInRange(rangeStart, rangeEnd)
}
