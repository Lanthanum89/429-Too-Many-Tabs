import { useEffect, useState } from 'react'
import { Card } from './Card'
import type { WidgetSize } from '../theme/modes'
import { fetchUpcomingEvents, hasValidCalendarToken, type CalendarEvent } from '../lib/googleCalendar'

export function CalendarWidget({ size }: { size: Exclude<WidgetSize, 'hidden'> }) {
  const [events, setEvents] = useState<CalendarEvent[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function connect() {
    setLoading(true)
    setError(null)
    try {
      const maxResults = size === 'lg' ? 8 : size === 'md' ? 5 : 3
      setEvents(await fetchUpcomingEvents(maxResults))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load calendar')
    } finally {
      setLoading(false)
    }
  }

  // Restore silently on mount if the cached token's still valid — a reload
  // (widget remount on a mode switch, a backgrounded tab the OS evicted)
  // shouldn't force reconnecting within the token's own lifetime.
  useEffect(() => {
    if (hasValidCalendarToken()) connect()
  }, [])

  return (
    <Card className="flex flex-col gap-2">
      <h2 className="font-display text-sm font-medium tracking-wide text-tan uppercase">
        Calendar
      </h2>
      {events === null ? (
        <button
          onClick={connect}
          disabled={loading}
          className="self-start rounded-lg bg-olive px-3 py-1 text-sm text-cream hover:bg-mustard hover:text-walnut disabled:opacity-50"
        >
          {loading ? 'Connecting…' : 'Connect Google Calendar'}
        </button>
      ) : (
        <ul className="flex flex-col gap-1 overflow-y-auto">
          {events.length === 0 && <li className="text-sm text-dim">Nothing upcoming.</li>}
          {events.map((event) => (
            <li key={event.id} className="text-sm text-cream">
              <span className="tabular-nums text-tan">
                {event.allDay
                  ? 'All day'
                  : event.start.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    })}
              </span>{' '}
              {event.title}
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-xs text-terracotta">{error}</p>}
    </Card>
  )
}
