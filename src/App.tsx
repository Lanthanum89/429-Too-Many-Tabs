import { useEffect, useState } from 'react'
import { Clock } from './components/Clock'
import { BinaryClock } from './components/BinaryClock'
import { WeatherWidget } from './components/WeatherWidget'
import { WeekCalendar } from './components/WeekCalendar'
import { EmailWidget } from './components/EmailWidget'
import { SpotifyWidget } from './components/SpotifyWidget'

function getGreeting(hour: number): string {
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme') as 'light' | 'dark' | null
    return saved || 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }

  const today = new Date()
  const greeting = getGreeting(today.getHours())
  return (
    <div className="dashboard p-4 sm:p-6">
      <header>
        <div className="flex items-center justify-between">
          <h1 className="font-mono text-4xl font-bold text-accent-neon">
            {greeting}, <span className="italic">Laura</span>.
          </h1>
          <button
            onClick={toggleTheme}
            className="theme-toggle"
            aria-label="Toggle dark mode"
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
      </header>

      <div className="dashboard-clock">
        <Clock />
      </div>
      <div className="dashboard-binary">
        <BinaryClock />
      </div>
      <div className="dashboard-weather">
        <WeatherWidget />
      </div>
      <div className="dashboard-calendar">
        <WeekCalendar />
      </div>
      <div className="dashboard-email">
        <EmailWidget />
      </div>
      <div className="dashboard-spotify">
        <SpotifyWidget />
      </div>
    </div>
  )
}

export default App
