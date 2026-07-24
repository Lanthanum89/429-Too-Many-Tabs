const API_KEY = import.meta.env.VITE_READING_BUSES_API_KEY
const HOME_STOP_CODES = (import.meta.env.VITE_HOME_STOP_CODES ?? '')
  .split(',')
  .map((code: string) => code.trim())
  .filter(Boolean)
const WORK_STOP_CODES = (import.meta.env.VITE_WORK_STOP_CODES ?? '')
  .split(',')
  .map((code: string) => code.trim())
  .filter(Boolean)

export interface Departure {
  line: string
  destination: string
  time: string // ISO
  monitored: boolean
  stopName: string
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

async function fetchStopPredictionsRaw(locationCode: string): Promise<string> {
  if (!API_KEY) throw new Error('Reading Buses API key not configured')

  const params = new URLSearchParams({ api_token: API_KEY, location: locationCode })
  const res = await fetch(`https://reading-opendata.r2p.com/api/v1/siri-sm?${params}`)
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
function parseSiriSm(xml: string): Departure[] {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  if (doc.getElementsByTagName('parsererror').length > 0) {
    throw new Error('Failed to parse bus predictions response')
  }

  const stopName = doc.getElementsByTagName('MonitoringName')[0]?.textContent ?? ''

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
    })
  }

  return departures.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
}

export async function fetchDeparturesForCodes(codes: string[]): Promise<Departure[]> {
  const perStop = await Promise.all(codes.map((code) => fetchStopPredictionsRaw(code).then(parseSiriSm)))
  return perStop.flat().sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
}
