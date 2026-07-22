import { Clock } from './components/Clock'
import { BinaryClock } from './components/BinaryClock'
import { WeatherWidget } from './components/WeatherWidget'
import { WeekCalendar } from './components/WeekCalendar'
import { EmailWidget } from './components/EmailWidget'
import { SpotifyWidget } from './components/SpotifyWidget'

function App() {
  return (
    <div className="dashboard p-6">
      <header className="border-b border-line pb-4">
        <h1 className="font-display text-2xl font-semibold text-accent-bright">
          429: Too Many Tabs
        </h1>
      </header>

      <div className="dashboard-clock">
        <Clock />
      </div>
      <div className="dashboard-binary">
        <div className="mini-widgets-row">
          <BinaryClock />
          <WeatherWidget />
        </div>
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
