import { Clock } from './components/Clock'
import { TodoList } from './components/TodoList'
import { MonthCalendar } from './components/MonthCalendar'
import { EmailWidget } from './components/EmailWidget'
import { SpotifyWidget } from './components/SpotifyWidget'

function App() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <header className="border-b border-line pb-4">
        <h1 className="font-display text-lg font-semibold tracking-wide text-accent-bright uppercase">
          Life Dashboard
        </h1>
      </header>

      <Clock />
      <MonthCalendar />
      <TodoList />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <EmailWidget />
        <SpotifyWidget />
      </div>
    </div>
  )
}

export default App
