import { useEffect, useState } from 'react'
import { Card } from './Card'
import { getCoords, FALLBACK_LAT, FALLBACK_LON } from '../lib/geolocation'
import { fetchWeather, type WeatherSnapshot } from '../lib/weather'
import { fetchSunAndUv, getMoonPhase, getUvRiskLabel, type SunAndUv } from '../lib/sunAndMoon'

const REFRESH_INTERVAL_MS = 15 * 60 * 1000

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function WeatherIcon({ weather }: { weather: WeatherSnapshot }) {
  const desc = weather.description.toLowerCase()

  if (desc.includes('thunder')) {
    return (
      <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M7 16a4 4 0 0 1 .9-7.9A5 5 0 0 1 17.5 10 3.5 3.5 0 0 1 17 17H7" />
        <path d="M12 12l-2 4h3l-2 4" />
      </svg>
    )
  }
  if (desc.includes('snow')) {
    return (
      <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M7 16a4 4 0 0 1 .9-7.9A5 5 0 0 1 17.5 10 3.5 3.5 0 0 1 17 17H7" />
        <path d="M9 19v.01M12 20v.01M15 19v.01" strokeLinecap="round" />
      </svg>
    )
  }
  if (desc.includes('rain') || desc.includes('drizzle')) {
    return (
      <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M7 16a4 4 0 0 1 .9-7.9A5 5 0 0 1 17.5 10 3.5 3.5 0 0 1 17 17H7" />
        <path d="M9 19v2M12 19v2M15 19v2" strokeLinecap="round" />
      </svg>
    )
  }
  if (desc.includes('fog') || desc.includes('overcast') || desc.includes('cloud')) {
    return (
      <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M7 16a4 4 0 0 1 .9-7.9A5 5 0 0 1 17.5 10 3.5 3.5 0 0 1 17 17H7" />
      </svg>
    )
  }
  if (!weather.isDay) {
    return (
      <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5z" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 2.5v2.5M12 19v2.5M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2.5 12H5M19 12h2.5M4.2 19.8 6 18M18 6l1.8-1.8" strokeLinecap="round" />
    </svg>
  )
}

type WeatherFxKind = 'sun' | 'rain' | 'snow' | null

function weatherFxKind(weather: WeatherSnapshot): WeatherFxKind {
  const desc = weather.description.toLowerCase()
  if (desc.includes('snow')) return 'snow'
  if (desc.includes('rain') || desc.includes('drizzle') || desc.includes('thunder')) return 'rain'
  if (weather.isDay && !desc.includes('cloud') && !desc.includes('fog') && !desc.includes('overcast')) return 'sun'
  return null
}

// Small decorative-only touches layered behind the icon so the widget
// reacts to what the weather actually is, not just showing a static glyph
// - purely cosmetic (aria-hidden, no layout footprint of its own since
// everything here is absolutely positioned within the icon's own box).
function WeatherFx({ kind }: { kind: WeatherFxKind }) {
  if (kind === 'sun') {
    return <span className="weather-fx-sun-glow absolute inset-0 -z-10 rounded-full" aria-hidden="true" />
  }
  if (kind === 'rain') {
    return (
      <span className="pointer-events-none absolute inset-0" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="weather-fx-raindrop absolute top-1/2 block w-px bg-accent"
            style={{ left: `${22 + i * 24}%`, animationDelay: `${i * 0.3}s` }}
          />
        ))}
      </span>
    )
  }
  if (kind === 'snow') {
    return (
      <span className="pointer-events-none absolute inset-0" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="weather-fx-snowflake absolute top-0 block h-1 w-1 rounded-full bg-accent-bright"
            style={{ left: `${18 + i * 26}%`, animationDelay: `${i * 0.6}s` }}
          />
        ))}
      </span>
    )
  }
  return null
}

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null)
  const [sunAndUv, setSunAndUv] = useState<SunAndUv | null>(null)
  const [error, setError] = useState<string | null>(null)
  const moon = getMoonPhase(new Date())

  useEffect(() => {
    let cancelled = false

    async function load() {
      const { lat, lon } = await getCoords()
      const isFallback = lat === FALLBACK_LAT && lon === FALLBACK_LON
      // allSettled, not all — sun/UV is supplementary to the core weather
      // display, so a failure there shouldn't blank out the temperature
      // and forecast too.
      const [weatherResult, sunResult] = await Promise.allSettled([
        fetchWeather(lat, lon, isFallback ? 'London' : undefined),
        fetchSunAndUv(lat, lon),
      ])
      if (cancelled) return
      if (weatherResult.status === 'fulfilled') {
        setWeather(weatherResult.value)
        setError(null)
      } else {
        setError(weatherResult.reason instanceof Error ? weatherResult.reason.message : 'Failed to load weather')
      }
      if (sunResult.status === 'fulfilled') setSunAndUv(sunResult.value)
    }

    load()
    const id = setInterval(load, REFRESH_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  return (
    <Card className="flex flex-col items-start justify-start gap-2 text-accent-neon">
      <h2 className="font-mono text-lg font-bold text-accent-neon">Weather</h2>
      {weather ? (
        <>
          <div className="mt-2 flex w-full flex-1 items-start gap-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="relative inline-block animate-float">
                  <WeatherFx kind={weatherFxKind(weather)} />
                  <WeatherIcon weather={weather} />
                </span>
                <span className="font-clock text-6xl font-black leading-none">{Math.round(weather.temperatureC)}°</span>
              </div>
              <div className="flex flex-col text-base text-muted">
                {weather.location && <span>{weather.location}</span>}
                <div className="mt-2 flex flex-col text-sm text-dim">
                  <span>{weather.description}</span>
                  <span>Feels like {Math.round(weather.feelsLikeC)}°</span>
                </div>
              </div>
            </div>
            {(weather.hourly.length > 0 || weather.tomorrow) && (
              <div className="ml-auto flex flex-col gap-1.5 border-l border-line pl-3">
                {weather.hourly.map((h, i) => {
                  const hour = new Date(h.time).getHours()
                  return (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="w-16 text-dim">{hour}:00</span>
                      <span className="font-clock w-16 text-right font-semibold">{Math.round(h.temperatureC)}°</span>
                      <span className="w-16 text-right text-dim">{Math.round(h.precipitationChance)}% rain</span>
                    </div>
                  )
                })}
                {weather.tomorrow && (
                  <div className="flex items-center gap-2 border-t border-line pt-1.5 text-sm">
                    <span className="w-16 text-dim">Tomorrow</span>
                    <span className="font-clock w-16 text-right font-semibold">
                      {Math.round(weather.tomorrow.tempMaxC)}°/{Math.round(weather.tomorrow.tempMinC)}°
                    </span>
                    <span className="w-16 text-right text-dim">{Math.round(weather.tomorrow.precipitationChance)}% rain</span>
                  </div>
                )}
              </div>
            )}
          </div>
          {sunAndUv && (
            <div className="mt-1.5 flex w-full flex-wrap items-center gap-x-5 gap-y-1 border-t border-line pt-1.5 text-xs text-dim">
              <span>
                {formatTime(sunAndUv.sunrise)} &middot; {formatTime(sunAndUv.sunset)}
              </span>
              <span>
                {moon.emoji} {moon.name}
              </span>
              <span>
                UV {Math.round(sunAndUv.uvIndexMax)} &middot; {getUvRiskLabel(sunAndUv.uvIndexMax)}
              </span>
            </div>
          )}
        </>
      ) : error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : (
        <p className="text-sm text-dim">Loading…</p>
      )}
    </Card>
  )
}
