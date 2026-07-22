import { Clock } from './components/Clock'
import { BinaryClock } from './components/BinaryClock'
import { WeatherWidget } from './components/WeatherWidget'
import { WeekCalendar } from './components/WeekCalendar'
import { EmailWidget } from './components/EmailWidget'
import { SpotifyWidget } from './components/SpotifyWidget'

function formatDate(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }
  return date.toLocaleDateString('en-US', options)
}

function getGreeting(hour: number): string {
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function App() {
  const today = new Date()
  const greeting = getGreeting(today.getHours())
  return (
    <div className="dashboard p-6">
      <header className="border-b border-line pb-6 mb-6">
        <p className="text-xs text-dim mb-2">{formatDate(today)}</p>
        <h1 className="font-display text-4xl font-semibold text-accent-bright">
          {greeting}, <span className="italic">Laura</span>.
        </h1>
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
