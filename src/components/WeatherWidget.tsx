import { useEffect, useState } from 'react'
import { Card } from './Card'
import { fetchWeather, type WeatherSnapshot } from '../lib/weather'

// Central London — used only if geolocation is unavailable or denied.
const FALLBACK_LAT = 51.5074
const FALLBACK_LON = -0.1278
const REFRESH_INTERVAL_MS = 15 * 60 * 1000

function getCoords(): Promise<{ lat: number; lon: number }> {
  if (!navigator.geolocation) {
    return Promise.resolve({ lat: FALLBACK_LAT, lon: FALLBACK_LON })
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => resolve({ lat: FALLBACK_LAT, lon: FALLBACK_LON }),
      { timeout: 5000 },
    )
  })
}

function WeatherIcon({ weather }: { weather: WeatherSnapshot }) {
  const desc = weather.description.toLowerCase()

  if (desc.includes('thunder')) {
    return (
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M7 16a4 4 0 0 1 .9-7.9A5 5 0 0 1 17.5 10 3.5 3.5 0 0 1 17 17H7" />
        <path d="M12 12l-2 4h3l-2 4" />
      </svg>
    )
  }
  if (desc.includes('snow')) {
    return (
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M7 16a4 4 0 0 1 .9-7.9A5 5 0 0 1 17.5 10 3.5 3.5 0 0 1 17 17H7" />
        <path d="M9 19v.01M12 20v.01M15 19v.01" strokeLinecap="round" />
      </svg>
    )
  }
  if (desc.includes('rain') || desc.includes('drizzle')) {
    return (
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M7 16a4 4 0 0 1 .9-7.9A5 5 0 0 1 17.5 10 3.5 3.5 0 0 1 17 17H7" />
        <path d="M9 19v2M12 19v2M15 19v2" strokeLinecap="round" />
      </svg>
    )
  }
  if (desc.includes('fog') || desc.includes('overcast') || desc.includes('cloud')) {
    return (
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M7 16a4 4 0 0 1 .9-7.9A5 5 0 0 1 17.5 10 3.5 3.5 0 0 1 17 17H7" />
      </svg>
    )
  }
  if (!weather.isDay) {
    return (
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5z" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 2.5v2.5M12 19v2.5M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2.5 12H5M19 12h2.5M4.2 19.8 6 18M18 6l1.8-1.8" strokeLinecap="round" />
    </svg>
  )
}

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const { lat, lon } = await getCoords()
        const data = await fetchWeather(lat, lon)
        if (!cancelled) {
          setWeather(data)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load weather')
      }
    }

    load()
    const id = setInterval(load, REFRESH_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  return (
    <Card className="flex flex-col items-center justify-center gap-1 text-center text-accent-bright">
      <h2 className="font-display text-lg text-muted">Weather</h2>
      {weather ? (
        <>
          <WeatherIcon weather={weather} />
          <span className="font-clock text-3xl font-black leading-none">{Math.round(weather.temperatureC)}°</span>
          <span className="text-xs text-muted">{weather.description}</span>
        </>
      ) : error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : (
        <p className="text-sm text-dim">Loading…</p>
      )}
    </Card>
  )
}
