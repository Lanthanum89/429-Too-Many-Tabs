function splitList(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
}

const PROXY_URL = import.meta.env.VITE_READING_BUSES_PROXY_URL
// /busstops (unlike /siri-sm) sends CORS headers, so it can still be called
// directly - used as a no-backend fallback to at least show stop info while
// the proxy (needed for live departure times) isn't deployed yet.
const API_KEY = import.meta.env.VITE_READING_BUSES_API_KEY
const HOME_STOP_CODES = splitList(import.meta.env.VITE_HOME_STOP_CODES)
const WORK_STOP_CODES = splitList(import.meta.env.VITE_WORK_STOP_CODES)
const HOME_STOP_LABELS = splitList(import.meta.env.VITE_HOME_STOP_LABELS)
const WORK_STOP_LABELS = splitList(import.meta.env.VITE_WORK_STOP_LABELS)

export interface Departure {
  line: string
  destination: string
  time: string // ISO
  monitored: boolean
  stopName: string
  locationCode: string
}

export interface StopInfo {
  locationCode: string
  description: string
}

export function hasReadingBusesProxy(): boolean {
  return Boolean(PROXY_URL)
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

export function getHomeStopLabels(): string[] {
  return HOME_STOP_LABELS
}

export function getWorkStopLabels(): string[] {
  return WORK_STOP_LABELS
}

interface RawStop {
  location_code: string
  description: string
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

// Shows configured stops without needing any live API call at all when every
// code already has a label - only falls back to /busstops (which needs the
// API key) to resolve a name for codes left unlabelled.
export async function fetchStopInfo(codes: string[], labels: string[]): Promise<StopInfo[]> {
  const needsLookup = codes.some((_, i) => !labels[i])
  if (!needsLookup) {
    return codes.map((code, i) => ({ locationCode: code, description: labels[i] }))
  }
  if (!API_KEY) {
    return codes.map((code, i) => ({ locationCode: code, description: labels[i] ?? code }))
  }

  const params = new URLSearchParams({ api_token: API_KEY })
  const res = await fetch(`https://reading-opendata.r2p.com/api/v1/busstops?${params}`)
  if (!res.ok) throw new Error(`Reading Buses API error: ${res.status}`)

  const raw = extractStops(await res.json())
  const byCode = new Map<string, string>()
  for (const stop of raw) {
    if (!byCode.has(stop.location_code)) byCode.set(stop.location_code, stop.description)
  }

  return codes.map((code, i) => ({
    locationCode: code,
    description: labels[i] ?? byCode.get(code) ?? code,
  }))
}

async function fetchStopPredictionsRaw(locationCode: string): Promise<string> {
  if (!PROXY_URL) throw new Error('Reading Buses proxy URL not configured')

  const params = new URLSearchParams({ location: locationCode })
  const res = await fetch(`${PROXY_URL}/siri-sm?${params}`)
  if (!res.ok) throw new Error(`Reading Buses API error: ${res.status}`)
  return res.text()
}

function text(el: Element | null, tag: string): string | null {
  return el?.getElementsByTagName(tag)[0]?.textContent ?? null
}

// SIRI Stop Monitoring is XML: one <MonitoredStopVisit> per upcoming call at
// the requested stop, whether it originates there (only departure times) or
// just passes through (arrival then departure). The soonest of
// expected/aimed arrival/departure is close enough to "when it's due here".
function parseSiriSm(xml: string, locationCode: string, label: string | undefined): Departure[] {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  if (doc.getElementsByTagName('parsererror').length > 0) {
    throw new Error('Failed to parse bus predictions response')
  }

  const stopName = label ?? doc.getElementsByTagName('MonitoringName')[0]?.textContent ?? ''

  const departures: Departure[] = []
  for (const visit of Array.from(doc.getElementsByTagName('MonitoredStopVisit'))) {
    const journey = visit.getElementsByTagName('MonitoredVehicleJourney')[0] ?? null
    const call = journey?.getElementsByTagName('MonitoredCall')[0] ?? null
    if (!journey || !call) continue

    const time =
      text(call, 'ExpectedArrivalTime') ??
      text(call, 'AimedArrivalTime') ??
      text(call, 'ExpectedDepartureTime') ??
      text(call, 'AimedDepartureTime')
    if (!time) continue

    departures.push({
      line: text(journey, 'PublishedLineName') ?? text(journey, 'LineRef') ?? '?',
      destination: text(journey, 'DestinationName') ?? '',
      time,
      monitored: text(journey, 'Monitored') === 'true',
      stopName,
      locationCode,
    })
  }

  return departures.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
}

export async function fetchDeparturesForCodes(codes: string[], labels: string[]): Promise<Departure[]> {
  const perStop = await Promise.all(
    codes.map((code, i) => fetchStopPredictionsRaw(code).then((xml) => parseSiriSm(xml, code, labels[i]))),
  )
  return perStop.flat().sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
}
