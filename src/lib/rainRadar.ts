// RainViewer's public API needs no key/signup for personal use - just
// attribution ("Weather data by RainViewer" + link), which the widget
// includes via Leaflet's attribution control alongside OpenStreetMap's.
const API_URL = 'https://api.rainviewer.com/public/weather-maps.json'

interface WeatherMapsResponse {
  host: string
  radar?: {
    past?: { time: number; path: string }[]
  }
}

export interface RadarFrame {
  tileUrlTemplate: string
  time: number
}

export async function fetchLatestRadarFrame(): Promise<RadarFrame> {
  const res = await fetch(API_URL)
  if (!res.ok) throw new Error(`RainViewer API error: ${res.status}`)

  const data = (await res.json()) as WeatherMapsResponse
  const frames = data.radar?.past ?? []
  const latest = frames[frames.length - 1]
  if (!latest) throw new Error('No radar frames available')

  return {
    tileUrlTemplate: `${data.host}${latest.path}/256/{z}/{x}/{y}/2/1_1.png`,
    time: latest.time,
  }
}
