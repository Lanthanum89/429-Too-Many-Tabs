const API_KEY = import.meta.env.VITE_READING_BUSES_API_KEY
const HOME_LAT_RAW = import.meta.env.VITE_HOME_LAT
const HOME_LON_RAW = import.meta.env.VITE_HOME_LON
const WORK_LAT_RAW = import.meta.env.VITE_WORK_LAT
const WORK_LON_RAW = import.meta.env.VITE_WORK_LON
const HOME_LAT = Number(HOME_LAT_RAW)
const HOME_LON = Number(HOME_LON_RAW)
const WORK_LAT = Number(WORK_LAT_RAW)
const WORK_LON = Number(WORK_LON_RAW)

export interface GeoPoint {
  lat: number
  lon: number
}

export interface BusStop {
  locationCode: string
  description: string
  latitude: number
  longitude: number
  distanceMeters: number
}

interface RawStop {
  location_code: string
  description: string
  latitude: string
  longitude: string
}

export function hasReadingBusesKey(): boolean {
  return Boolean(API_KEY)
}

export function hasHomeLocation(): boolean {
  return Boolean(HOME_LAT_RAW) && Boolean(HOME_LON_RAW) && Number.isFinite(HOME_LAT) && Number.isFinite(HOME_LON)
}

export function hasWorkLocation(): boolean {
  return Boolean(WORK_LAT_RAW) && Boolean(WORK_LON_RAW) && Number.isFinite(WORK_LAT) && Number.isFinite(WORK_LON)
}

export function getHomeLocation(): GeoPoint {
  return { lat: HOME_LAT, lon: HOME_LON }
}

export function getWorkLocation(): GeoPoint {
  return { lat: WORK_LAT, lon: WORK_LON }
}

// The /busstops response has been observed as a bare JSON array, but the
// exact wrapper (if any) hasn't been confirmed across all accounts - check
// a couple of common wrapper keys defensively before giving up.
function extractStops(payload: unknown): RawStop[] {
  if (Array.isArray(payload)) return payload as RawStop[]
  if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>
    for (const key of ['stops', 'data', 'busstops', 'results']) {
      if (Array.isArray(obj[key])) return obj[key] as RawStop[]
    }
  }
  throw new Error('Unexpected /busstops response shape')
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

export async function fetchBusStopsRaw(): Promise<unknown> {
  if (!API_KEY) throw new Error('Reading Buses API key not configured')

  const params = new URLSearchParams({ api_token: API_KEY })
  const res = await fetch(`https://reading-opendata.r2p.com/api/v1/busstops?${params}`)
  if (!res.ok) throw new Error(`Reading Buses API error: ${res.status}`)
  return res.json()
}

export async function fetchNearbyStops(origin: GeoPoint, limit = 5): Promise<BusStop[]> {
  const raw = extractStops(await fetchBusStopsRaw())
  const byLocation = new Map<string, BusStop>()

  for (const stop of raw) {
    if (byLocation.has(stop.location_code)) continue
    const latitude = Number(stop.latitude)
    const longitude = Number(stop.longitude)
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue
    byLocation.set(stop.location_code, {
      locationCode: stop.location_code,
      description: stop.description,
      latitude,
      longitude,
      distanceMeters: haversineMeters(origin.lat, origin.lon, latitude, longitude),
    })
  }

  return [...byLocation.values()].sort((a, b) => a.distanceMeters - b.distanceMeters).slice(0, limit)
}
