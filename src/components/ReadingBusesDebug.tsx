import { useEffect, useState } from 'react'
import { Card } from './Card'
import { fetchNearbyStops, hasHomeLocation, hasReadingBusesKey, type BusStop } from '../lib/readingBuses'

// Temporary: shows the nearby-stops list so we can confirm distance sorting
// looks right before wiring up live departures. Delete once confirmed.
export function ReadingBusesDebug() {
  const [stops, setStops] = useState<BusStop[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!hasReadingBusesKey() || !hasHomeLocation()) return
    fetchNearbyStops()
      .then(setStops)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
  }, [])

  return (
    <Card className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto">
      <h2 className="font-mono text-lg font-bold text-accent-neon">Reading Buses (debug)</h2>
      {!hasReadingBusesKey() && <p className="text-xs text-dim">Set VITE_READING_BUSES_API_KEY.</p>}
      {hasReadingBusesKey() && !hasHomeLocation() && (
        <p className="text-xs text-dim">Set VITE_HOME_LAT / VITE_HOME_LON.</p>
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
