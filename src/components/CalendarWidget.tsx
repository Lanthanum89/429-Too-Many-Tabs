import { useState } from 'react'
import { Card } from './Card'
import type { WidgetSize } from '../theme/modes'
import { fetchUpcomingEvents, type CalendarEvent } from '../lib/googleCalendar'

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

  return (
    <Card className="flex flex-col gap-2">
      <h2 className="text-sm font-medium text-gray-400">Calendar</h2>
      {events === null ? (
        <button
          onClick={connect}
          disabled={loading}
          className="self-start rounded-lg bg-gray-700 px-3 py-1 text-sm hover:bg-gray-600 disabled:opacity-50"
        >
          {loading ? 'Connecting…' : 'Connect Google Calendar'}
        </button>
      ) : (
        <ul className="flex flex-col gap-1 overflow-y-auto">
          {events.length === 0 && <li className="text-sm text-gray-500">Nothing upcoming.</li>}
          {events.map((event) => (
            <li key={event.id} className="text-sm">
              <span className="text-gray-400">
                {event.allDay
                  ? 'All day'
                  : event.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>{' '}
              {event.title}
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </Card>
  )
}
