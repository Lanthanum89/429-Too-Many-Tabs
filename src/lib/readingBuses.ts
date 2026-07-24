const API_KEY = import.meta.env.VITE_READING_BUSES_API_KEY
const HOME_STOP_CODES = (import.meta.env.VITE_HOME_STOP_CODES ?? '')
  .split(',')
  .map((code: string) => code.trim())
  .filter(Boolean)
const WORK_STOP_CODES = (import.meta.env.VITE_WORK_STOP_CODES ?? '')
  .split(',')
  .map((code: string) => code.trim())
  .filter(Boolean)

export interface BusStop {
  locationCode: string
  description: string
}

interface RawStop {
  location_code: string
  description: string
}

export function hasReadingBusesKey(): boolean {
  return Boolean(API_KEY)
}

export function hasHomeStops(): boolean {
  return HOME_STOP_CODES.length > 0
}

export function hasWorkStops(): boolean {
  return WORK_STOP_CODES.length > 0
}

export function getHomeStopCodes(): string[] {
  return HOME_STOP_CODES
}

export function getWorkStopCodes(): string[] {
  return WORK_STOP_CODES
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

export async function fetchBusStopsRaw(): Promise<unknown> {
  if (!API_KEY) throw new Error('Reading Buses API key not configured')

  const params = new URLSearchParams({ api_token: API_KEY })
  const res = await fetch(`https://reading-opendata.r2p.com/api/v1/busstops?${params}`)
  if (!res.ok) throw new Error(`Reading Buses API error: ${res.status}`)
  return res.json()
}

// Response format not yet confirmed (SIRI-SM is typically XML rather than
// JSON) - return raw text so either can be inspected before writing a
// real parser.
export async function fetchStopPredictionsRaw(locationCode: string): Promise<string> {
  if (!API_KEY) throw new Error('Reading Buses API key not configured')

  const params = new URLSearchParams({ api_token: API_KEY, location: locationCode })
  const res = await fetch(`https://reading-opendata.r2p.com/api/v1/siri-sm?${params}`)
  if (!res.ok) throw new Error(`Reading Buses API error: ${res.status}`)
  return res.text()
}

export async function findStopByCode(locationCode: string): Promise<string | null> {
  const raw = extractStops(await fetchBusStopsRaw())
  const match = raw.find((stop) => stop.location_code === locationCode)
  return match?.description ?? null
}

// Looks up descriptions for a fixed list of stop codes, preserving the
// order they were given in.
export async function fetchStopsByCodes(codes: string[]): Promise<BusStop[]> {
  const raw = extractStops(await fetchBusStopsRaw())
  const byCode = new Map<string, string>()
  for (const stop of raw) {
    if (!byCode.has(stop.location_code)) byCode.set(stop.location_code, stop.description)
  }

  return codes.map((code) => ({
    locationCode: code,
    description: byCode.get(code) ?? code,
  }))
}
