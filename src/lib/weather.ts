export interface HourlyForecast {
  time: string
  temperatureC: number
  weatherCode: number
}

export interface WeatherSnapshot {
  temperatureC: number
  description: string
  isDay: boolean
  location: string
  hourly: HourlyForecast[]
}

// WMO weather codes, as returned by Open-Meteo's `weather_code` field.
const WEATHER_DESCRIPTIONS: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Rime fog',
  51: 'Light drizzle',
  53: 'Drizzle',
  55: 'Dense drizzle',
  61: 'Slight rain',
  63: 'Rain',
  65: 'Heavy rain',
  71: 'Slight snow',
  73: 'Snow',
  75: 'Heavy snow',
  80: 'Rain showers',
  81: 'Rain showers',
  82: 'Violent rain showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm, hail',
  99: 'Thunderstorm, hail',
}

interface OpenMeteoResponse {
  current?: {
    temperature_2m?: number
    weather_code?: number
    is_day?: number
  }
  hourly?: {
    time?: string[]
    temperature_2m?: number[]
    weather_code?: number[]
  }
}

async function getLocationName(lat: number, lon: number, fallbackName?: string): Promise<string> {
  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?latitude=${lat}&longitude=${lon}&language=en&limit=1`,
    )
    if (!res.ok) return fallbackName ?? 'Current location'
    const data = (await res.json()) as {
      results?: Array<{
        name?: string
        admin1?: string
        country?: string
      }>
    }
    const result = data.results?.[0]
    if (result?.name) {
      const parts = [result.name]
      if (result.admin1 && result.admin1 !== result.name) {
        parts.push(result.admin1)
      }
      return parts.join(', ')
    }
    return fallbackName ?? 'Current location'
  } catch {
    return fallbackName ?? 'Current location'
  }
}

// Open-Meteo needs no API key and allows direct browser CORS requests —
// fits the fully-static, no-backend architecture the rest of 429 uses.
export async function fetchWeather(lat: number, lon: number, fallbackLocationName?: string): Promise<WeatherSnapshot> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: 'temperature_2m,weather_code,is_day',
    hourly: 'temperature_2m,weather_code',
  })
  const [weatherRes, location] = await Promise.all([
    fetch(`https://api.open-meteo.com/v1/forecast?${params}`),
    getLocationName(lat, lon, fallbackLocationName),
  ])

  if (!weatherRes.ok) {
    throw new Error(`Weather API error: ${weatherRes.status}`)
  }

  const data = (await weatherRes.json()) as OpenMeteoResponse
  const current = data.current ?? {}
  const weatherCode = current.weather_code ?? 0
  const now = new Date()
  const currentHour = now.getHours()

  const hourly = (data.hourly?.time ?? [])
    .slice(currentHour, currentHour + 3)
    .map((time, i) => ({
      time,
      temperatureC: data.hourly?.temperature_2m?.[currentHour + i] ?? 0,
      weatherCode: data.hourly?.weather_code?.[currentHour + i] ?? 0,
    }))

  return {
    temperatureC: current.temperature_2m ?? 0,
    description: WEATHER_DESCRIPTIONS[weatherCode] ?? 'Unknown',
    isDay: current.is_day !== 0,
    location,
    hourly,
  }
}
