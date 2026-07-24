import { useEffect, useState } from 'react'
import { Card } from './Card'
import {
  fetchNearbyStops,
  fetchStopPredictionsRaw,
  findStopByCode,
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
  const [lookupCode, setLookupCode] = useState('')
  const [lookupResult, setLookupResult] = useState<string | null>(null)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [lookupPending, setLookupPending] = useState(false)

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

  async function runLookup() {
    if (!lookupCode.trim()) return
    setLookupPending(true)
    setLookupResult(null)
    setLookupError(null)
    try {
      const description = await findStopByCode(lookupCode.trim())
      setLookupResult(description ?? 'No stop found with that code.')
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : 'Failed to look up')
    } finally {
      setLookupPending(false)
    }
  }

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
      {hasReadingBusesKey() && (
        <div className="mt-2 flex flex-col gap-1 border-t border-line-strong pt-2">
          <p className="text-[11px] text-dim">Look up a stop code:</p>
          <div className="flex gap-1">
            <input
              value={lookupCode}
              onChange={(e) => setLookupCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runLookup()}
              placeholder="e.g. 030054700001"
              className="min-w-0 flex-1 rounded border border-line-strong bg-void px-2 py-1 text-xs text-ink"
            />
            <button
              onClick={runLookup}
              disabled={lookupPending}
              className="rounded bg-accent-neon px-2 py-1 text-xs text-void disabled:opacity-50"
            >
              {lookupPending ? '…' : 'Go'}
            </button>
          </div>
          {lookupResult && <p className="text-xs text-ink">{lookupResult}</p>}
          {lookupError && <p className="text-xs text-danger">{lookupError}</p>}
        </div>
      )}
    </Card>
  )
}
