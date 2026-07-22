import { useEffect, useMemo, useState } from 'react'
import { Card } from './Card'
import {
  fetchWeekEvents,
  hasValidCalendarToken,
  toDateKey,
  type CalendarEvent,
} from '../lib/googleCalendar'


function formatEventTime(event: CalendarEvent): string {
  if (event.allDay) return 'All day'
  return event.start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function getWeekStart(date: Date): Date {
  const offset = (date.getDay() + 6) % 7 // Mon = 0 ... Sun = 6
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - offset)
}

export function WeekCalendar() {
  const [events, setEvents] = useState<CalendarEvent[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const today = useMemo(() => new Date(), [])
  const weekStart = useMemo(() => getWeekStart(today), [today])

  async function connect() {
    setLoading(true)
    setError(null)
    try {
      setEvents(await fetchWeekEvents(weekStart))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load calendar')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (hasValidCalendarToken()) connect()
  }, [])

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const event of events ?? []) {
      const list = map.get(event.dateKey)
      if (list) list.push(event)
      else map.set(event.dateKey, [event])
    }
    return map
  }, [events])

  // Get upcoming events for next 3 days
  const upcomingEvents = useMemo(() => {
    const nextThreeDays = Array.from({ length: 3 }, (_, i) => {
      const day = new Date(today)
      day.setDate(day.getDate() + i)
      return toDateKey(day)
    })

    const allEvents: (CalendarEvent & { dayLabel: string })[] = []
    nextThreeDays.forEach((dayKey, i) => {
      const dayEvents = eventsByDay.get(dayKey) ?? []
      const date = new Date(today)
      date.setDate(date.getDate() + i)
      const dayLabel = i === 0 ? 'Today' : date.toLocaleDateString([], { weekday: 'short' })

      dayEvents.forEach((event) => {
        allEvents.push({ ...event, dayLabel })
      })
    })

    return allEvents.sort((a, b) => a.start.getTime() - b.start.getTime())
  }, [events, today, eventsByDay])

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="font-display text-lg text-muted">Calendar</h2>

      {events === null ? (
        <button
          onClick={connect}
          disabled={loading}
          className="self-start rounded-lg bg-accent px-4 py-2 text-sm font-medium text-void hover:bg-accent-bright disabled:opacity-50"
        >
          {loading ? 'Connecting…' : 'Connect Google Calendar'}
        </button>
      ) : (
        <ul className="flex flex-col gap-2">
          {upcomingEvents.length === 0 && <li className="text-sm text-dim">No upcoming events.</li>}
          {upcomingEvents.map((event) => (
            <li key={event.id}>
              <a
                href={event.htmlLink}
                target="_blank"
                rel="noreferrer"
                className="flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-2 hover:text-accent-bright"
              >
                <span className="w-14 shrink-0 text-xs text-dim">
                  {event.dayLabel} {event.allDay ? '' : formatEventTime(event)}
                </span>
                <span className="truncate text-ink">{event.title}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </Card>
  )
}
