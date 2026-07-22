import { Clock } from './components/Clock'
import { BinaryClock } from './components/BinaryClock'
import { TodoList } from './components/TodoList'
import { MonthCalendar } from './components/MonthCalendar'
import { EmailWidget } from './components/EmailWidget'
import { SpotifyWidget } from './components/SpotifyWidget'

function App() {
  return (
    <div className="dashboard mx-auto max-w-6xl p-6">
      <header className="border-b border-line pb-4">
        <h1 className="font-display text-lg font-semibold tracking-wide text-accent-bright uppercase">
          Life Dashboard
        </h1>
      </header>

      <div className="dashboard-clock">
        <Clock />
      </div>
      <div className="dashboard-binary">
        <BinaryClock />
      </div>
      <div className="dashboard-calendar">
        <MonthCalendar />
      </div>
      <div className="dashboard-todo">
        <TodoList />
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
