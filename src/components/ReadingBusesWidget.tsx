import { useEffect, useState } from 'react'
import { Card } from './Card'
import {
  fetchDeparturesForCodes,
  getHomeStopCodes,
  getHomeStopLabels,
  getWorkStopCodes,
  getWorkStopLabels,
  hasHomeStops,
  hasReadingBusesKey,
  hasWorkStops,
  type Departure,
} from '../lib/readingBuses'

type Origin = 'home' | 'work'

const REFRESH_INTERVAL_MS = 60 * 1000
const MAX_DEPARTURES = 5

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function ReadingBusesWidget() {
  const [origin, setOrigin] = useState<Origin>('home')
  const [departures, setDepartures] = useState<Departure[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const hasOrigin = origin === 'home' ? hasHomeStops() : hasWorkStops()

  useEffect(() => {
    if (!hasReadingBusesKey() || !hasOrigin) return undefined

    let cancelled = false

    async function load() {
      try {
        const codes = origin === 'home' ? getHomeStopCodes() : getWorkStopCodes()
        const labels = origin === 'home' ? getHomeStopLabels() : getWorkStopLabels()
        const data = await fetchDeparturesForCodes(codes, labels)
        if (!cancelled) {
          setDepartures(data)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load departures')
      }
    }

    setDepartures(null)
    setError(null)
    load()
    const id = setInterval(load, REFRESH_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [origin, hasOrigin])

  return (
    <Card className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-mono text-lg font-bold text-accent-neon">Buses</h2>
        {hasHomeStops() && hasWorkStops() && (
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
        <p className="text-xs text-dim">Set VITE_{origin.toUpperCase()}_STOP_CODES.</p>
      )}
      {hasReadingBusesKey() && hasOrigin && departures === null && !error && (
        <p className="text-sm text-dim">Loading…</p>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
      {departures && (
        <ul className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
          {departures.length === 0 && <li className="text-sm text-dim">No buses due.</li>}
          {departures.slice(0, MAX_DEPARTURES).map((d, i) => (
            <li key={i} className="flex flex-col gap-0 text-sm">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-ink">
                  <span className="font-bold text-accent-bright">{d.line}</span> {d.destination}
                </span>
                <span className={d.monitored ? 'text-ink' : 'text-dim'}>{formatTime(d.time)}</span>
              </div>
              <span className="text-[10px] uppercase tracking-wide text-dim">{d.stopName}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
