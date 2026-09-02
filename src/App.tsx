import { useEffect, useState } from 'react'
import { Clock } from './components/Clock'
import { BinaryClock } from './components/BinaryClock'
import { WeatherWidget } from './components/WeatherWidget'
import { WeekCalendar } from './components/WeekCalendar'
import { EmailWidget } from './components/EmailWidget'
import { SpotifyWidget } from './components/SpotifyWidget'
import { GuardianWidget } from './components/GuardianWidget'
import { RadarWidget } from './components/RadarWidget'
import { CountdownWidget } from './components/CountdownWidget'
import { GithubWidget } from './components/GithubWidget'
import { ReadingBusesWidget } from './components/ReadingBusesWidget'
import { GalaxyBackground } from './components/GalaxyBackground'
import { isTheme, nextTheme, type Theme } from './lib/theme'

function getGreeting(hour: number): string {
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

// ISO 8601 week number: the week containing the year's first Thursday is
// week 1 - shifting to the nearest Thursday first is what makes the last
// few days of December/first few of January land in the correct week
// instead of off-by-one at the year boundary.
function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - dayNum + 3)
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4))
  const firstThursdayDayNum = (firstThursday.getUTCDay() + 6) % 7
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstThursdayDayNum + 3)
  return 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 86400000))
}

function App() {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme')
    return isTheme(saved) ? saved : 'light'
  })
  const [refreshing, setRefreshing] = useState(false)

  function handleRefresh() {
    setRefreshing(true)
    // A reload this fast would otherwise skip right past the spin - give it
    // a beat to actually be seen before the page tears down.
    setTimeout(() => window.location.reload(), 500)
  }

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const upcoming = nextTheme(theme)
  const toggleTheme = () => {
    setTheme(upcoming)
  }

  const today = new Date()
  const greeting = getGreeting(today.getHours())
  const dateStr = today.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
  const week = getISOWeek(today)
  return (
    <div className="dashboard p-4 sm:p-6">
      {theme === 'dark' && <GalaxyBackground />}
      <header>
        <div className="flex items-center justify-between gap-4 w-full">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0 text-left">
            <h1 className="font-mono text-sm font-bold text-accent-neon leading-tight">
              {greeting}, <span className="italic">Laura</span>.
            </h1>
            <p className="font-mono text-xs font-semibold tracking-wider text-muted leading-tight">
              {dateStr.toUpperCase()}
            </p>
            <p className="font-mono text-xs font-semibold tracking-wider text-dim leading-tight">
              WEEK {week}
            </p>
          </div>
          <div className="key-sm-wrapper flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="theme-toggle key-sm"
              aria-label="Refresh dashboard"
              title="Refresh dashboard"
            >
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={refreshing ? 'animate-spin' : ''}
              >
                <path d="M21 12a9 9 0 1 1-2.64-6.36" strokeLinecap="round" />
                <path d="M21 3v6h-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              onClick={toggleTheme}
              className="theme-toggle key-sm"
              aria-label={`Switch theme (currently ${theme})`}
              title={`Switch to ${upcoming} theme`}
            >
              {/* The icon shows what you'll GET, not what you're on - so one
                  glance says where the next press lands. In order round the
                  cycle: a moon (-> dark), a half-filled circle (-> mono), a
                  filled circle (-> mono-dark), a sun (-> light). */}
              {theme === 'light' ? (
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              ) : theme === 'dark' ? (
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none" />
                </svg>
              ) : theme === 'mono' ? (
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="9" fill="currentColor" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="dashboard-clock">
        <Clock />
      </div>
      <div className="dashboard-calendar">
        <WeekCalendar />
      </div>
      <div className="dashboard-commits">
        <ReadingBusesWidget />
      </div>
      <div className="dashboard-leftstack">
        <div className="dashboard-spotify-binary-row">
          <div className="dashboard-spotify">
            <SpotifyWidget />
          </div>
          <div className="dashboard-binary">
            <BinaryClock />
          </div>
        </div>
        <div className="dashboard-weather">
          <WeatherWidget />
        </div>
        <div className="dashboard-countdown">
          <CountdownWidget />
        </div>
        <div className="dashboard-github">
          <GithubWidget />
        </div>
      </div>
      <div className="dashboard-email">
        <EmailWidget />
      </div>
      <div className="dashboard-guardian">
        <GuardianWidget />
      </div>
      <div className="dashboard-radar">
        <RadarWidget theme={theme} />
      </div>
    </div>
  )
}

export default App
