import { useEffect, useState } from 'react'
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Clock } from './components/Clock'
import { BinaryClock } from './components/BinaryClock'
import { WeatherWidget } from './components/WeatherWidget'
import { WeekCalendar } from './components/WeekCalendar'
import { EmailWidget } from './components/EmailWidget'
import { SpotifyWidget } from './components/SpotifyWidget'
import { DraggableWidget } from './components/DraggableWidget'

const DEFAULT_WIDGET_ORDER = ['clock', 'spotify', 'binary', 'weather', 'calendar', 'email']

const WIDGET_COMPONENTS: Record<string, React.ComponentType> = {
  clock: Clock,
  spotify: SpotifyWidget,
  binary: BinaryClock,
  weather: WeatherWidget,
  calendar: WeekCalendar,
  email: EmailWidget,
}

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

  const [widgetOrder, setWidgetOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('widgetOrder')
    return saved ? JSON.parse(saved) : DEFAULT_WIDGET_ORDER
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem('widgetOrder', JSON.stringify(widgetOrder))
  }, [widgetOrder])

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setWidgetOrder((items) => {
        const oldIndex = items.indexOf(active.id as string)
        const newIndex = items.indexOf(over.id as string)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  const today = new Date()
  const greeting = getGreeting(today.getHours())
  const dateStr = today.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="dashboard-with-sidebar">
        <aside className="dashboard-sidebar" />
        <main className="dashboard-main">
          <header>
            <div className="flex items-start justify-between gap-4 w-full">
              <div className="flex flex-col gap-0 text-left">
                <h1 className="font-mono text-sm font-bold text-accent-neon leading-tight">
                  {greeting}, <span className="italic">Laura</span>.
                </h1>
                <p className="font-mono text-xs tracking-wider text-dim opacity-50 leading-tight">
                  {dateStr.toUpperCase()}
                </p>
              </div>
              <button
                onClick={toggleTheme}
                className="theme-toggle"
                aria-label="Toggle dark mode"
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                {theme === 'light' ? (
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
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
          </header>

          <SortableContext items={widgetOrder} strategy={verticalListSortingStrategy}>
            <div className="dashboard-widgets">
              {widgetOrder.map((widgetId) => {
                const Component = WIDGET_COMPONENTS[widgetId]
                return (
                  <DraggableWidget key={widgetId} id={widgetId}>
                    <Component />
                  </DraggableWidget>
                )
              })}
            </div>
          </SortableContext>
        </main>
      </div>
    </DndContext>
  )
}

export default App
