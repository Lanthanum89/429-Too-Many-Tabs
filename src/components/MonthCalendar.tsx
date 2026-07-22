import { useEffect, useMemo, useState } from 'react'
import { Card } from './Card'
import {
  fetchMonthEvents,
  hasValidCalendarToken,
  toDateKey,
  type CalendarEvent,
} from '../lib/googleCalendar'

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MAX_VISIBLE_EVENTS_PER_DAY = 3

// Monday-first grid covering the whole month, padded with the trailing days
// of the previous/next month so every week is a full row of 7.
function getMonthGrid(monthDate: Date): Date[] {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7 // Mon = 0 ... Sun = 6
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7

  return Array.from({ length: totalCells }, (_, i) => new Date(year, month, 1 - firstWeekday + i))
}

export function MonthCalendar() {
  const [events, setEvents] = useState<CalendarEvent[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const today = useMemo(() => new Date(), [])
  const grid = useMemo(() => getMonthGrid(today), [today])
  const monthLabel = useMemo(
    () => today.toLocaleDateString([], { month: 'long', year: 'numeric' }),
    [today],
  )

  async function connect() {
    setLoading(true)
    setError(null)
    try {
      setEvents(await fetchMonthEvents(today))
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
  const weekCount = grid.length / 7

  return (
    <Card className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-sm tracking-wide text-muted uppercase">Calendar</h2>
        <span className="font-display text-sm text-muted">{monthLabel}</span>
      </div>

      {events === null ? (
        <button
          onClick={connect}
          disabled={loading}
          className="self-start rounded-lg bg-accent px-4 py-2 text-sm font-medium text-void hover:bg-accent-bright disabled:opacity-50"
        >
          {loading ? 'Connecting…' : 'Connect Google Calendar'}
        </button>
      ) : (
        <div
          className="grid min-h-0 flex-1 grid-cols-7 gap-1"
          style={{ gridTemplateRows: `auto repeat(${weekCount}, minmax(0, 1fr))` }}
        >
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="pb-1 text-center text-xs text-dim uppercase">
              {label}
            </div>
          ))}
          {grid.map((day) => {
            const key = toDateKey(day)
            const inMonth = day.getMonth() === today.getMonth()
            const isToday = key === todayKey
            const dayEvents = eventsByDay.get(key) ?? []
            const overflow = dayEvents.length - MAX_VISIBLE_EVENTS_PER_DAY

            return (
              <div
                key={key}
                className={`flex min-h-16 flex-col gap-0.5 overflow-hidden rounded-lg border p-1 text-left ${
                  isToday ? 'border-accent bg-surface-2' : 'border-line'
                } ${inMonth ? '' : 'opacity-40'}`}
              >
                <span className={`text-xs ${isToday ? 'font-semibold text-accent-bright' : 'text-muted'}`}>
                  {day.getDate()}
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
              </div>
            )
          })}
        </div>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </Card>
  )
}
