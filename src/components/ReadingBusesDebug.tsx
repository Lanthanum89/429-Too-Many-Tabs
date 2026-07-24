import { useEffect, useState } from 'react'
import { Card } from './Card'
import {
  fetchNearbyStops,
  fetchStopPredictionsRaw,
  getHomeLocation,
  getWorkLocation,
  hasHomeLocation,
  hasReadingBusesKey,
  hasWorkLocation,
  type BusStop,
} from '../lib/readingBuses'

type Origin = 'home' | 'work'

// Temporary: shows the nearby-stops list plus the raw prediction feed for
// the nearest one, so we can confirm the siri-sm response shape before
// writing a real "next bus" parser. Delete once confirmed.
export function ReadingBusesDebug() {
  const [origin, setOrigin] = useState<Origin>('home')
  const [stops, setStops] = useState<BusStop[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [predictionsRaw, setPredictionsRaw] = useState<string | null>(null)
  const [predictionsError, setPredictionsError] = useState<string | null>(null)

  const hasOrigin = origin === 'home' ? hasHomeLocation() : hasWorkLocation()

  useEffect(() => {
    if (!hasReadingBusesKey() || !hasOrigin) return
    setStops(null)
    setError(null)
    setPredictionsRaw(null)
    setPredictionsError(null)
    const point = origin === 'home' ? getHomeLocation() : getWorkLocation()
    fetchNearbyStops(point)
      .then(setStops)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
  }, [origin, hasOrigin])

  useEffect(() => {
    if (!stops || stops.length === 0) return
    fetchStopPredictionsRaw(stops[0].locationCode)
      .then(setPredictionsRaw)
      .catch((err) => setPredictionsError(err instanceof Error ? err.message : 'Failed to load'))
  }, [stops])

  return (
    <Card className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-mono text-lg font-bold text-accent-neon">Reading Buses (debug)</h2>
        {hasHomeLocation() && hasWorkLocation() && (
          <div className="flex rounded-full border border-line-strong p-0.5 text-[11px]">
            <button
              onClick={() => setOrigin('home')}
              className={`rounded-full px-2.5 py-0.5 transition-colors ${
                origin === 'home' ? 'bg-accent-neon text-void' : 'text-dim hover:text-ink'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => setOrigin('work')}
              className={`rounded-full px-2.5 py-0.5 transition-colors ${
                origin === 'work' ? 'bg-accent-neon text-void' : 'text-dim hover:text-ink'
              }`}
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
      {predictionsError && <p className="text-xs text-danger">{predictionsError}</p>}
      {predictionsRaw && (
        <>
          <p className="text-[11px] text-dim">Raw predictions for {stops?.[0].description}:</p>
          <pre className="whitespace-pre-wrap break-all text-[10px] text-ink">{predictionsRaw.slice(0, 4000)}</pre>
        </>
      )}
    </Card>
  )
}
