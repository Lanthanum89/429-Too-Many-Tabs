import { requestGoogleToken, type GoogleToken } from './googleAuth'

const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly'

export interface CalendarEvent {
  id: string
  title: string
  start: Date
  allDay: boolean
}

interface CalendarApiEvent {
  id: string
  summary?: string
  start?: { dateTime?: string; date?: string }
}

let cachedToken: GoogleToken | null = null

async function getToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt - 60_000 > Date.now()) {
    return cachedToken.accessToken
  }
  cachedToken = await requestGoogleToken(CALENDAR_SCOPE)
  return cachedToken.accessToken
}

export async function fetchUpcomingEvents(maxResults = 5): Promise<CalendarEvent[]> {
  const token = await getToken()
  const params = new URLSearchParams({
    timeMin: new Date().toISOString(),
    maxResults: String(maxResults),
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
  return (data.items ?? []).map((item) => ({
    id: item.id,
    title: item.summary ?? '(no title)',
    start: new Date(item.start?.dateTime ?? item.start?.date ?? Date.now()),
    allDay: !item.start?.dateTime,
  }))
}
