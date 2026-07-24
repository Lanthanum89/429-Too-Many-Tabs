import { useEffect, useState } from 'react'
import { Card } from './Card'
import {
  fetchNearbyStops,
  getHomeLocation,
  getWorkLocation,
  hasHomeLocation,
  hasReadingBusesKey,
  hasWorkLocation,
  type BusStop,
} from '../lib/readingBuses'

type Origin = 'home' | 'work'

// Temporary: shows the nearby-stops list so we can confirm distance sorting
// looks right before wiring up live departures. Delete once confirmed.
export function ReadingBusesDebug() {
  const [origin, setOrigin] = useState<Origin>('home')
  const [stops, setStops] = useState<BusStop[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const hasOrigin = origin === 'home' ? hasHomeLocation() : hasWorkLocation()

  useEffect(() => {
    if (!hasReadingBusesKey() || !hasOrigin) return
    setStops(null)
    setError(null)
    const point = origin === 'home' ? getHomeLocation() : getWorkLocation()
    fetchNearbyStops(point)
      .then(setStops)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
  }, [origin, hasOrigin])

  return (
    <Card className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-mono text-lg font-bold text-accent-neon">Reading Buses (debug)</h2>
        {hasHomeLocation() && hasWorkLocation() && (
          <div className="flex gap-1 text-[11px]">
            <button
              onClick={() => setOrigin('home')}
              className={origin === 'home' ? 'text-accent-bright' : 'text-dim hover:text-ink'}
            >
              Home
            </button>
            <span className="text-dim">/</span>
            <button
              onClick={() => setOrigin('work')}
              className={origin === 'work' ? 'text-accent-bright' : 'text-dim hover:text-ink'}
            >
              Work
            </button>
          </div>
        )}
      </div>
      {!hasReadingBusesKey() && <p className="text-xs text-dim">Set VITE_READING_BUSES_API_KEY.</p>}
      {hasReadingBusesKey() && !hasOrigin && (
        <p className="text-xs text-dim">
          Set VITE_{origin.toUpperCase()}_LAT / VITE_{origin.toUpperCase()}_LON.
        </p>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
      {stops && (
        <ul className="text-xs text-ink">
          {stops.map((s) => (
            <li key={s.locationCode}>
              {s.description} — {Math.round(s.distanceMeters)}m — {s.locationCode}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
