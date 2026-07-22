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

function formatEventTime(event: CalendarEvent): string {
  if (event.allDay) return 'All day'
  return event.start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export function WeekCalendar() {
  const [events, setEvents] = useState<CalendarEvent[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [openDay, setOpenDay] = useState<Date | null>(null)

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
        <div className="grid grid-cols-7 gap-1">
          {grid.map((day) => {
            const key = toDateKey(day)
            const isToday = key === todayKey
            const dayEvents = eventsByDay.get(key) ?? []
            const overflow = dayEvents.length - MAX_VISIBLE_EVENTS_PER_DAY

            return (
              <button
                key={key}
                onClick={() => setOpenDay(day)}
                className={`flex min-h-20 flex-col gap-0.5 overflow-hidden rounded-lg border p-1 text-left ${
                  isToday ? 'border-accent bg-surface-2' : 'border-line hover:border-line-strong'
                }`}
              >
                <span className={`text-xs ${isToday ? 'font-semibold text-accent-bright' : 'text-muted'}`}>
                  {day.toLocaleDateString([], { weekday: 'short' })} {day.getDate()}
                </span>
                {dayEvents.slice(0, MAX_VISIBLE_EVENTS_PER_DAY).map((event) => (
                  <span
                    key={event.id}
                    className="truncate rounded bg-accent/20 px-1 text-[0.65rem] text-ink"
                    title={event.title}
                  >
                    {event.title}
                  </span>
                ))}
                {overflow > 0 && <span className="text-[0.65rem] text-dim">+{overflow} more</span>}
              </button>
            )
          })}
        </div>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}

      {openDay && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setOpenDay(null)}
        >
          <div
            className="max-h-[80vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-line bg-surface p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="font-display text-lg text-ink">
                {openDay.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
              </h3>
              <button
                onClick={() => setOpenDay(null)}
                aria-label="Close"
                className="text-muted hover:text-accent-bright"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <ul className="flex flex-col gap-2">
              {(eventsByDay.get(toDateKey(openDay)) ?? []).length === 0 && (
                <li className="text-sm text-dim">No events.</li>
              )}
              {(eventsByDay.get(toDateKey(openDay)) ?? []).map((event) => (
                <li key={event.id}>
                  <a
                    href={event.htmlLink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-2 hover:text-accent-bright"
                  >
                    <span className="w-16 shrink-0 text-xs text-dim">{formatEventTime(event)}</span>
                    <span className="text-ink">{event.title}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </Card>
  )
}
