import { useEffect, useState } from 'react'
import { Card } from './Card'
import {
  fetchDeparturesForCodes,
  fetchStopInfo,
  getHomeStopCodes,
  getHomeStopLabels,
  getWorkStopCodes,
  getWorkStopLabels,
  hasHomeStops,
  hasReadingBusesKey,
  hasReadingBusesProxy,
  hasWorkStops,
  type Departure,
  type StopInfo,
} from '../lib/readingBuses'

type Origin = 'home' | 'work'

const REFRESH_INTERVAL_MS = 60 * 1000
const MAX_DEPARTURES = 5

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function liveDeparturesUrl(locationCode: string): string {
  return `https://www.reading-buses.co.uk/stops/${locationCode}`
}

export function ReadingBusesWidget() {
  const [origin, setOrigin] = useState<Origin>('home')
  const [departures, setDepartures] = useState<Departure[] | null>(null)
  const [stopInfo, setStopInfo] = useState<StopInfo[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const hasOrigin = origin === 'home' ? hasHomeStops() : hasWorkStops()
  const liveMode = hasReadingBusesProxy()

  useEffect(() => {
    if (!hasOrigin) return undefined
    if (!liveMode && !hasReadingBusesKey()) return undefined

    let cancelled = false
    const codes = origin === 'home' ? getHomeStopCodes() : getWorkStopCodes()
    const labels = origin === 'home' ? getHomeStopLabels() : getWorkStopLabels()

    async function load() {
      try {
        if (liveMode) {
          const data = await fetchDeparturesForCodes(codes, labels)
          if (!cancelled) {
            setDepartures(data)
            setError(null)
          }
        } else {
          const data = await fetchStopInfo(codes, labels)
          if (!cancelled) {
            setStopInfo(data)
            setError(null)
          }
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load')
      }
    }

    setDepartures(null)
    setStopInfo(null)
    setError(null)
    load()
    const id = liveMode ? setInterval(load, REFRESH_INTERVAL_MS) : undefined
    return () => {
      cancelled = true
      if (id) clearInterval(id)
    }
  }, [origin, hasOrigin, liveMode])

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
      {!liveMode && !hasReadingBusesKey() && (
        <p className="text-xs text-dim">Set VITE_READING_BUSES_API_KEY or VITE_READING_BUSES_PROXY_URL.</p>
      )}
      {(liveMode || hasReadingBusesKey()) && !hasOrigin && (
        <p className="text-xs text-dim">Set VITE_{origin.toUpperCase()}_STOP_CODES.</p>
      )}
      {(liveMode || hasReadingBusesKey()) && hasOrigin && departures === null && stopInfo === null && !error && (
        <p className="text-sm text-dim">Loading…</p>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
      {departures && (
        <ul className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
          {departures.length === 0 && <li className="text-sm text-dim">No buses due.</li>}
          {departures.slice(0, MAX_DEPARTURES).map((d, i) => (
            <li key={i}>
              <a
                href={liveDeparturesUrl(d.locationCode)}
                target="_blank"
                rel="noreferrer"
                className="flex flex-col gap-0 text-sm hover:text-accent-bright"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-ink">
                    <span className="font-bold text-accent-bright">{d.line}</span> {d.destination}
                  </span>
                  <span className={d.monitored ? 'text-ink' : 'text-dim'}>{formatTime(d.time)}</span>
                </div>
                <span className="text-[10px] uppercase tracking-wide text-dim">{d.stopName}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
      {stopInfo && (
        <ul className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
          {stopInfo.map((s) => (
            <li key={s.locationCode}>
              <a
                href={liveDeparturesUrl(s.locationCode)}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-ink hover:text-accent-bright"
              >
                {s.description}
              </a>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
