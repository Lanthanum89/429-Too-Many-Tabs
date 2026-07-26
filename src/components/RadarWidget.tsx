import { useEffect, useState } from 'react'
import { Card } from './Card'
import { RainRadarPanel } from './RainRadarPanel'
import { getCoords, type Coords } from '../lib/geolocation'

export function RadarWidget() {
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
        <div className="min-h-0 w-full flex-1">
          <RainRadarPanel lat={coords.lat} lon={coords.lon} />
        </div>
      ) : (
        <p className="text-sm text-dim">Loading…</p>
      )}
    </Card>
  )
}
