export interface WeatherSnapshot {
  temperatureC: number
  description: string
  isDay: boolean
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
}

// Open-Meteo needs no API key and allows direct browser CORS requests —
// fits the fully-static, no-backend architecture the rest of 429 uses.
export async function fetchWeather(lat: number, lon: number): Promise<WeatherSnapshot> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: 'temperature_2m,weather_code,is_day',
  })
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
  if (!res.ok) {
    throw new Error(`Weather API error: ${res.status}`)
  }

  const data = (await res.json()) as OpenMeteoResponse
  const current = data.current ?? {}
  const weatherCode = current.weather_code ?? 0

  return {
    temperatureC: current.temperature_2m ?? 0,
    description: WEATHER_DESCRIPTIONS[weatherCode] ?? 'Unknown',
    isDay: current.is_day !== 0,
  }
}
