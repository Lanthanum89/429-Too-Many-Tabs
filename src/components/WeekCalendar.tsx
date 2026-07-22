import { useEffect, useMemo, useState } from 'react'
import { Card } from './Card'
import {
  fetchWeekEvents,
  hasValidCalendarToken,
  toDateKey,
  type CalendarEvent,
} from '../lib/googleCalendar'

const MAX_VISIBLE_EVENTS_PER_DAY = 3

// Monday-first week containing `date`.
function getWeekStart(date: Date): Date {
  const offset = (date.getDay() + 6) % 7 // Mon = 0 ... Sun = 6
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - offset)
}

function getWeekGrid(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(weekStart)
    day.setDate(day.getDate() + i)
    return day
  })
}

export function WeekCalendar() {
  const [events, setEvents] = useState<CalendarEvent[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const today = useMemo(() => new Date(), [])
  const weekStart = useMemo(() => getWeekStart(today), [today])
  const grid = useMemo(() => getWeekGrid(weekStart), [weekStart])

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

  const todayKey = toDateKey(today)

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="font-display text-sm tracking-wide text-muted uppercase">Calendar</h2>

      {events === null ? (
        <button
          onClick={connect}
          disabled={loading}
          className="self-start rounded-lg bg-accent px-4 py-2 text-sm font-medium text-void hover:bg-accent-bright disabled:opacity-50"
        >
          {loading ? 'Connecting…' : 'Connect Google Calendar'}
        </button>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {grid.map((day) => {
            const key = toDateKey(day)
            const isToday = key === todayKey
            const dayEvents = eventsByDay.get(key) ?? []
            const overflow = dayEvents.length - MAX_VISIBLE_EVENTS_PER_DAY

            return (
              <div
                key={key}
                className={`flex min-h-20 flex-col gap-0.5 overflow-hidden rounded-lg border p-1 text-left ${
                  isToday ? 'border-accent bg-surface-2' : 'border-line'
                }`}
              >
                <span className={`text-xs ${isToday ? 'font-semibold text-accent-bright' : 'text-muted'}`}>
                  {day.toLocaleDateString([], { weekday: 'short' })} {day.getDate()}
                </span>
                {dayEvents.slice(0, MAX_VISIBLE_EVENTS_PER_DAY).map((event) => (
                  <a
                    key={event.id}
                    href={event.htmlLink}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate rounded bg-accent/20 px-1 text-[0.65rem] text-ink hover:bg-accent/40 hover:text-accent-bright"
                    title={event.title}
                  >
                    {event.title}
                  </a>
                ))}
                {overflow > 0 && <span className="text-[0.65rem] text-dim">+{overflow} more</span>}
              </div>
            )
          })}
        </div>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </Card>
  )
}
