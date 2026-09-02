import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { fetchLatestRadarFrame } from '../lib/rainRadar'
import { isDarkTheme, type Theme } from '../lib/theme'

// Icon.Default._getIconUrl() unconditionally prepends an auto-detected
// "imagePath" (read from leaflet.css's own background-image url()) in
// front of whatever iconUrl/shadowUrl it's given, even a full absolute
// URL - so mergeOptions alone still produced a mangled, doubled-up path
// once that detection found leaflet.css. Deleting the override falls
// back to the base Icon class's _getIconUrl, which just returns the
// option as-is, so our explicit (Vite-resolved) URLs are used verbatim.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

const REFRESH_INTERVAL_MS = 10 * 60 * 1000

// Basemap tiles. RainViewer's radar overlay is keyless already - only the
// map underneath ever needed a key (CARTO started requiring one for
// basemaps.cartocdn.com), so both providers below are token-free and
// nothing about this widget ships a credential in the bundle. Switch
// BASEMAP if a provider changes its terms; nothing else needs touching.
type BasemapProvider = 'esri' | 'osm'

const BASEMAP: BasemapProvider = 'esri'

interface BasemapConfig {
  url: (theme: Theme) => string
  attribution: string
  // True when the provider only serves light tiles, so dark mode has to be
  // faked by inverting them (see .map-tiles-darken in index.css).
  darkenInCss: boolean
}

const BASEMAPS: Record<BasemapProvider, BasemapConfig> = {
  // Esri's greyscale Canvas basemaps ship real dark and light variants, so
  // dark mode stays genuinely dark and only the app's hue tint is applied -
  // the same arrangement CARTO's dark_all/light_all gave us. Each mono
  // variant takes the tiles matching its own ground (light for 'mono', dark
  // for 'mono-dark') and drops the hue tint in CSS instead (see
  // .map-tiles-themed under [data-theme^='mono']), so the map stays grey. Note the
  // {z}/{y}/{x} order: Esri's REST tile scheme is row-major, not Leaflet's
  // usual {z}/{x}/{y}, and getting it wrong silently serves the wrong tiles.
  esri: {
    url: (theme) =>
      `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_${
        isDarkTheme(theme) ? 'Dark' : 'Light'
      }_Gray_Base/MapServer/tile/{z}/{y}/{x}`,
    attribution: 'Tiles &copy; <a href="https://www.esri.com">Esri</a>',
    darkenInCss: false,
  },
  // OpenStreetMap's standard tiles are the most dependably keyless option
  // going, but they're only served light, so dark mode inverts them. Their
  // tile usage policy is aimed at light/personal use, which this dashboard
  // is - it's a donated resource, so no aggressive refresh loops.
  osm: {
    url: () => 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    darkenInCss: true,
  },
}

export function RainRadarPanel({
  lat,
  lon,
  theme,
}: {
  lat: number
  lon: number
  theme: Theme
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

    // className hooks into index.css for the lilac tint filter, plus the
    // dark-mode inversion when the provider only serves light tiles.
    const basemap = BASEMAPS[BASEMAP]
    L.tileLayer(basemap.url(theme), {
      attribution: basemap.attribution,
      className: basemap.darkenInCss ? 'map-tiles-themed map-tiles-darken' : 'map-tiles-themed',
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
