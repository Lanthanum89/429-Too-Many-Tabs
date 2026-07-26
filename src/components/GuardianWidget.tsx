import { useEffect, useState } from 'react'
import { Card } from './Card'
import { RainRadarPanel } from './RainRadarPanel'
import { fetchTopHeadlines, hasGuardianKey, type GuardianHeadline } from '../lib/guardian'
import { getCoords, type Coords } from '../lib/geolocation'

const REFRESH_INTERVAL_MS = 15 * 60 * 1000

export function GuardianWidget() {
  const [headlines, setHeadlines] = useState<GuardianHeadline[] | null>(null)
  const [coords, setCoords] = useState<Coords | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!hasGuardianKey()) return undefined

    let cancelled = false

    async function load() {
      try {
        const data = await fetchTopHeadlines()
        if (!cancelled) {
          setHeadlines(data)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load headlines')
      }
    }

    load()
    const id = setInterval(load, REFRESH_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    getCoords().then((c) => {
      if (!cancelled) setCoords(c)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <Card className="flex min-h-0 flex-1 flex-col gap-3">
      <h2 className="font-mono text-lg font-bold text-accent-neon">Guardian Headlines</h2>
      {!hasGuardianKey() ? (
        <p className="text-xs text-dim">Set VITE_GUARDIAN_API_KEY to show headlines.</p>
      ) : headlines === null ? (
        error ? (
          <p className="text-xs text-danger">{error}</p>
        ) : (
          <p className="text-sm text-dim">Loading…</p>
        )
      ) : (
        <ul className="flex max-h-52 flex-col overflow-y-auto">
          {headlines.length === 0 && <li className="text-sm text-dim">No headlines.</li>}
          {headlines.map((item) => (
            <li key={item.id}>
              <a
                href={item.webUrl}
                target="_blank"
                rel="noreferrer"
                className="flex flex-col gap-0.5 py-1.5 hover:text-accent-bright"
              >
                <span className="text-[11px] uppercase tracking-wide text-dim">{item.sectionName}</span>
                <span className="text-sm font-medium text-ink">{item.webTitle}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
      {error && headlines !== null && <p className="text-xs text-danger">{error}</p>}
      {coords && (
        <div className="min-h-0 w-full flex-1 border-t border-line pt-2">
          <RainRadarPanel lat={coords.lat} lon={coords.lon} />
        </div>
      )}
    </Card>
  )
}
