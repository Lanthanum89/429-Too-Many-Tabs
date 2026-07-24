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

function ExternalLinkIcon() {
  return (
    <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0">
      <path d="M7 17L17 7M17 7H9M17 7v8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ReadingBusesWidget() {
  const [origin, setOrigin] = useState<Origin>('home')
  const [departures, setDepartures] = useState<Departure[] | null>(null)
  const [stopInfo, setStopInfo] = useState<StopInfo[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const hasOrigin = origin === 'home' ? hasHomeStops() : hasWorkStops()
  const liveMode = hasReadingBusesProxy()
  const codes = origin === 'home' ? getHomeStopCodes() : getWorkStopCodes()
  const labels = origin === 'home' ? getHomeStopLabels() : getWorkStopLabels()
  // Every code has its own label, so no live API call is needed at all to
  // show stop names - the key is only required to resolve a name for a code
  // left unlabelled.
  const needsKey = codes.some((_, i) => !labels[i])
  const canShowStopInfo = !needsKey || hasReadingBusesKey()
  const ready = liveMode || canShowStopInfo

  useEffect(() => {
    if (!hasOrigin || !ready) return undefined

    let cancelled = false

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
  }, [origin, hasOrigin, liveMode, ready])

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
      {!hasOrigin && <p className="text-xs text-dim">Set VITE_{origin.toUpperCase()}_STOP_CODES.</p>}
      {hasOrigin && !ready && (
        <p className="text-xs text-dim">Set VITE_READING_BUSES_API_KEY (or label every stop).</p>
      )}
      {hasOrigin && ready && departures === null && stopInfo === null && !error && (
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
                className="flex flex-col gap-0 rounded-lg border border-line px-2.5 py-1.5 text-sm transition-colors hover:border-accent-neon hover:bg-accent-neon/10"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-ink">
                    <span className="font-bold text-accent-bright">{d.line}</span> {d.destination}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className={d.monitored ? 'text-ink' : 'text-dim'}>{formatTime(d.time)}</span>
                    <ExternalLinkIcon />
                  </span>
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
                className="flex items-center justify-between gap-2 rounded-lg border border-line px-2.5 py-1.5 text-sm text-ink transition-colors hover:border-accent-neon hover:bg-accent-neon/10"
              >
                {s.description}
                <ExternalLinkIcon />
              </a>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
