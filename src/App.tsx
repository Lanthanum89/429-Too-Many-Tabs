import { useMode } from './theme/ModeContext'
import type { WidgetId, WidgetSize } from './theme/modes'
import { Clock } from './components/Clock'
import { TodoList } from './components/TodoList'
import { CalendarWidget } from './components/CalendarWidget'
import { EmailWidget } from './components/EmailWidget'
import { SpotifyWidget } from './components/SpotifyWidget'

const WIDGET_ORDER: WidgetId[] = ['clock', 'todo', 'calendar', 'email', 'spotify']

const SPAN_CLASS: Record<Exclude<WidgetSize, 'hidden'>, string> = {
  sm: 'sm:col-span-1',
  md: 'sm:col-span-1',
  lg: 'sm:col-span-2',
}

function App() {
  const { mode, modes, setModeId } = useMode()

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-4 p-4">
      <header className="flex flex-col gap-2">
        <div className="flex gap-2">
          {modes.map((m) => (
            <button
              key={m.id}
              onClick={() => setModeId(m.id)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                m.id === mode.id
                  ? 'bg-gray-100 text-gray-900'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p className="text-sm text-gray-500">{mode.blurb}</p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {WIDGET_ORDER.map((id) => {
          const size = mode.widgets[id]
          if (size === 'hidden') return null
          return (
            <div key={id} className={SPAN_CLASS[size]}>
              {id === 'clock' && <Clock size={size} />}
              {id === 'todo' && <TodoList size={size} />}
              {id === 'calendar' && <CalendarWidget size={size} />}
              {id === 'email' && <EmailWidget size={size} />}
              {id === 'spotify' && <SpotifyWidget size={size} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default App
