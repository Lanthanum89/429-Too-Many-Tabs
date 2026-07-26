import { useEffect, useState } from 'react'
import { Card } from './Card'
import { RainRadarPanel } from './RainRadarPanel'
import { getCoords, type Coords } from '../lib/geolocation'

export function RadarWidget({ theme }: { theme: 'light' | 'dark' }) {
  const [coords, setCoords] = useState<Coords | null>(null)

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
      <h2 className="font-mono text-lg font-bold text-accent-neon">Rain Radar</h2>
      {coords ? (
        // min-h-64 is a floor, not just a min-height nicety: on the mobile
        // stacked layout this card sits in an auto-height grid row with
        // nothing to grow into, so flex-1 alone resolves to 0 - and unlike
        // text content, the map has no intrinsic height of its own to
        // fall back on, so it silently rendered into a 0px box. The floor
        // only matters there; on the landscape grid this row already has
        // real height to grow into, so flex-1 dominates as before.
        <div className="min-h-64 w-full flex-1">
          <RainRadarPanel lat={coords.lat} lon={coords.lon} theme={theme} />
        </div>
      ) : (
        <p className="text-sm text-dim">Loading…</p>
      )}
    </Card>
  )
}
