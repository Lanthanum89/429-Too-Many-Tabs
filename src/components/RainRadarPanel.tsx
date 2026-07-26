import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import { fetchLatestRadarFrame } from '../lib/rainRadar'

const REFRESH_INTERVAL_MS = 10 * 60 * 1000

export function RainRadarPanel({ lat, lon }: { lat: number; lon: number }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const radarLayerRef = useRef<L.TileLayer | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!containerRef.current) return undefined

    const map = L.map(containerRef.current, {
      center: [lat, lon],
      zoom: 7,
      maxZoom: 12,
      zoomControl: false,
      attributionControl: true,
    })
    mapRef.current = map

    // CartoDB's dark basemap (free, no key - CC BY 3.0, attribution
    // required) reads far closer to the app's dark-lilac theme than
    // default OSM tiles; className hooks into index.css for the lilac
    // tint filter.
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      className: 'map-tiles-themed',
    }).addTo(map)

    L.marker([lat, lon]).addTo(map)

    // Leaflet needs a real size at init - this panel lives in a flex layout
    // that may not have settled its final height on the first paint.
    const resize = new ResizeObserver(() => map.invalidateSize())
    resize.observe(containerRef.current)

    return () => {
      resize.disconnect()
      map.remove()
      mapRef.current = null
    }
  }, [lat, lon])

  useEffect(() => {
    let cancelled = false

    async function loadRadar() {
      try {
        const frame = await fetchLatestRadarFrame()
        if (cancelled || !mapRef.current) return
        if (radarLayerRef.current) mapRef.current.removeLayer(radarLayerRef.current)
        radarLayerRef.current = L.tileLayer(frame.tileUrlTemplate, {
          opacity: 0.6,
          // RainViewer only generates radar tiles natively up to zoom 7 -
          // without this, zooming past that requests tiles that don't
          // exist and gets back a "Zoom Level Not Supported" placeholder
          // image instead of an upscaled tile.
          maxNativeZoom: 7,
          maxZoom: 12,
          attribution: 'Weather data &copy; <a href="https://rainviewer.com">RainViewer</a>',
        }).addTo(mapRef.current)
        setError(null)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load radar')
      }
    }

    loadRadar()
    const id = setInterval(loadRadar, REFRESH_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [lat, lon])

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg">
      <div ref={containerRef} className="h-full w-full" />
      {error && (
        <p className="absolute bottom-1 left-1 rounded bg-void/80 px-1.5 py-0.5 text-[10px] text-danger">{error}</p>
      )}
    </div>
  )
}
