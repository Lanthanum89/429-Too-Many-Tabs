import { useEffect, useState } from 'react'
import { Card } from './Card'
import { getCoords } from '../lib/geolocation'
import { fetchSunAndUv, getMoonPhase, getUvRiskLabel, type SunAndUv } from '../lib/sunAndMoon'

const REFRESH_INTERVAL_MS = 15 * 60 * 1000

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export function SunMoonWidget() {
  const [sunAndUv, setSunAndUv] = useState<SunAndUv | null>(null)
  const [error, setError] = useState<string | null>(null)
  const moon = getMoonPhase(new Date())

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const { lat, lon } = await getCoords()
        const data = await fetchSunAndUv(lat, lon)
        if (!cancelled) {
          setSunAndUv(data)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load')
      }
    }

    load()
    const id = setInterval(load, REFRESH_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="font-mono text-lg font-bold text-accent-neon">Sun &amp; Moon</h2>
      <div className="flex flex-1 flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex flex-col">
          <span className="text-[11px] uppercase tracking-wide text-dim">Sunrise / Sunset</span>
          {sunAndUv ? (
            <span className="font-clock text-lg font-semibold text-ink">
              {formatTime(sunAndUv.sunrise)} &middot; {formatTime(sunAndUv.sunset)}
            </span>
          ) : (
            <span className="text-sm text-dim">{error ?? 'Loading…'}</span>
          )}
        </div>
        <div className="flex flex-col">
          <span className="text-[11px] uppercase tracking-wide text-dim">Moon</span>
          <span className="font-clock text-lg font-semibold text-ink">
            {moon.emoji} {moon.name}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[11px] uppercase tracking-wide text-dim">UV Index</span>
          {sunAndUv ? (
            <span className="font-clock text-lg font-semibold text-ink">
              {Math.round(sunAndUv.uvIndexMax)} &middot; {getUvRiskLabel(sunAndUv.uvIndexMax)}
            </span>
          ) : (
            <span className="text-sm text-dim">{error ?? 'Loading…'}</span>
          )}
        </div>
      </div>
    </Card>
  )
}
