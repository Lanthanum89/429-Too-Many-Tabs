import { useEffect, useRef, useState } from 'react'
import { Card } from './Card'
import { RainRadarPanel, type RainRadarPanelHandle } from './RainRadarPanel'
import { getCoords, type Coords } from '../lib/geolocation'
import type { Theme } from '../lib/theme'
import { useRegisterRefresh } from '../lib/useRegisterRefresh'
import { formatUpdated, useRelativeTimeTick } from '../lib/formatUpdated'
import { RefreshButton } from './RefreshButton'

export function RadarWidget({ theme }: { theme: Theme }) {
  const [coords, setCoords] = useState<Coords | null>(null)
  const panelRef = useRef<RainRadarPanelHandle>(null)

  useEffect(() => {
    let cancelled = false
    getCoords().then((c) => {
      if (!cancelled) setCoords(c)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Tracked separately from useRegisterRefresh's own lastUpdated: the panel
  // reloads on its own mount/interval cycle too (see onLoaded below), not
  // only via this hook's wrapped `refresh`, so relying on the hook alone
  // would leave the timestamp stale between manual/global refreshes.
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  useRelativeTimeTick()

  const { refreshing, refresh } = useRegisterRefresh(
    'radar',
    () => panelRef.current?.refresh() ?? Promise.resolve(false),
    coords !== null,
  )

  return (
    <Card className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-mono text-lg font-bold text-accent-neon">Rain Radar</h2>
        {coords && (
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="hidden font-mono text-[10px] text-dim sm:inline">{formatUpdated(lastUpdated)}</span>
            )}
            <RefreshButton onClick={refresh} refreshing={refreshing} label="Refresh Rain Radar" />
          </div>
        )}
      </div>
      {coords ? (
        // min-h-64 is a floor, not just a min-height nicety: on the mobile
        // stacked layout this card sits in an auto-height grid row with
        // nothing to grow into, so flex-1 alone resolves to 0 - and unlike
        // text content, the map has no intrinsic height of its own to
        // fall back on, so it silently rendered into a 0px box. The floor
        // only matters there; on the landscape grid this row already has
        // real height to grow into, so flex-1 dominates as before.
        <div className="min-h-64 w-full flex-1">
          <RainRadarPanel
            ref={panelRef}
            lat={coords.lat}
            lon={coords.lon}
            theme={theme}
            onLoaded={() => setLastUpdated(new Date())}
          />
        </div>
      ) : (
        <p className="text-sm text-dim">Loading…</p>
      )}
    </Card>
  )
}
