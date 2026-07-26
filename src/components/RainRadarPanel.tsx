import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { fetchLatestRadarFrame } from '../lib/rainRadar'

// Leaflet's default marker icon references its image assets via a
// runtime-built relative path ("images/marker-icon.png"), which only
// resolves in dev where Vite serves node_modules directly - the
// production bundle has no such path, so the marker silently 404s
// without this override pointing it at Vite's actually-bundled URLs.
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

const REFRESH_INTERVAL_MS = 10 * 60 * 1000

export function RainRadarPanel({
  lat,
  lon,
  theme,
}: {
  lat: number
  lon: number
  theme: 'light' | 'dark'
}) {
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

    // CartoDB's free, no-key, CC BY 3.0 basemaps read far closer to the
    // app's theme than default OSM tiles - dark_all for dark mode,
    // light_all for light mode; className hooks into index.css for the
    // lilac tint filter.
    const basemapStyle = theme === 'dark' ? 'dark_all' : 'light_all'
    L.tileLayer(`https://{s}.basemaps.cartocdn.com/${basemapStyle}/{z}/{x}/{y}{r}.png`, {
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
      radarLayerRef.current = null
    }
  }, [lat, lon, theme])

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
  }, [lat, lon, theme])

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg">
      <div ref={containerRef} className="h-full w-full" />
      {error && (
        <p className="absolute bottom-1 left-1 rounded bg-void/80 px-1.5 py-0.5 text-[10px] text-danger">{error}</p>
      )}
    </div>
  )
}
