export interface SunAndUv {
  sunrise: Date
  sunset: Date
  uvIndexMax: number
}

// Open-Meteo also serves sunrise/sunset/UV under the same free, no-key
// endpoint the weather widget already uses - no separate API needed.
export async function fetchSunAndUv(lat: number, lon: number): Promise<SunAndUv> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    daily: 'sunrise,sunset,uv_index_max',
    timezone: 'auto',
    forecast_days: '1',
  })
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
  if (!res.ok) throw new Error(`Weather API error: ${res.status}`)

  const data = (await res.json()) as {
    daily?: { sunrise?: string[]; sunset?: string[]; uv_index_max?: number[] }
  }
  const sunrise = data.daily?.sunrise?.[0]
  const sunset = data.daily?.sunset?.[0]
  if (!sunrise || !sunset) throw new Error('Sunrise/sunset unavailable')

  return {
    sunrise: new Date(sunrise),
    sunset: new Date(sunset),
    uvIndexMax: data.daily?.uv_index_max?.[0] ?? 0,
  }
}

export function getUvRiskLabel(uv: number): string {
  if (uv < 3) return 'Low'
  if (uv < 6) return 'Moderate'
  if (uv < 8) return 'High'
  if (uv < 11) return 'Very High'
  return 'Extreme'
}

// Names only. The glyph used to come from here too (the moon emoji, which
// every platform renders in full colour and which no CSS filter can reach
// through a font) - MoonPhaseIcon draws the disc instead, from `phase`.
const MOON_PHASE_NAMES = [
  'New Moon',
  'Waxing Crescent',
  'First Quarter',
  'Waxing Gibbous',
  'Full Moon',
  'Waning Gibbous',
  'Last Quarter',
  'Waning Crescent',
]

const SYNODIC_MONTH_DAYS = 29.530588853
// A known new moon (2000-01-06 18:14 UTC), used as the reference point to
// count elapsed synodic months from - no external astronomy API needed,
// the moon's cycle length is fixed and predictable enough for a display
// widget (not navigation-grade precision).
const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14, 0)

export interface MoonPhase {
  name: string
  /** Position through the synodic cycle: 0 and 1 are new, 0.5 is full. */
  phase: number
  illumination: number
}

export function getMoonPhase(date: Date): MoonPhase {
  const daysSince = (date.getTime() - KNOWN_NEW_MOON) / 86400000
  const phase = (((daysSince % SYNODIC_MONTH_DAYS) + SYNODIC_MONTH_DAYS) % SYNODIC_MONTH_DAYS) / SYNODIC_MONTH_DAYS
  // The name is the nearest of the eight conventional phases; `phase` itself
  // stays continuous, because the drawn disc can show where between two names
  // the moon actually is where a name has to round to one of eight.
  const index = Math.round(phase * 8) % 8
  const illumination = Math.round(((1 - Math.cos(phase * 2 * Math.PI)) / 2) * 100)
  return { name: MOON_PHASE_NAMES[index], phase, illumination }
}
