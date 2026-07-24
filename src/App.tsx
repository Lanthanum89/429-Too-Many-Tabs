import { useEffect, useState } from 'react'
import GridLayout from 'react-grid-layout'
import { Clock } from './components/Clock'
import { BinaryClock } from './components/BinaryClock'
import { WeatherWidget } from './components/WeatherWidget'
import { WeekCalendar } from './components/WeekCalendar'
import { EmailWidget } from './components/EmailWidget'
import { SpotifyWidget } from './components/SpotifyWidget'

const WIDGET_COMPONENTS: Record<string, React.ComponentType> = {
  clock: Clock,
  spotify: SpotifyWidget,
  binary: BinaryClock,
  weather: WeatherWidget,
  calendar: WeekCalendar,
  email: EmailWidget,
}

const DEFAULT_LAYOUT = [
  { x: 0, y: 0, w: 12, h: 2, i: 'clock' },
  { x: 0, y: 2, w: 12, h: 2, i: 'spotify' },
  { x: 0, y: 4, w: 6, h: 2, i: 'binary' },
  { x: 6, y: 4, w: 6, h: 2, i: 'weather' },
  { x: 0, y: 6, w: 6, h: 3, i: 'calendar' },
  { x: 6, y: 6, w: 6, h: 3, i: 'email' },
]

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

  const [isEditMode, setIsEditMode] = useState(false)
  const [layout, setLayout] = useState(() => {
    const saved = localStorage.getItem('dashboardLayout')
    return saved ? JSON.parse(saved) : DEFAULT_LAYOUT
  })
  const [containerWidth, setContainerWidth] = useState(window.innerWidth - 50)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    const handleResize = () => {
      setContainerWidth(window.innerWidth - 50)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }

  const handleLayoutChange = (newLayout: unknown) => {
    setLayout(newLayout as typeof layout)
  }

  const saveLayout = () => {
    localStorage.setItem('dashboardLayout', JSON.stringify(layout))
    setIsEditMode(false)
  }

  const resetLayout = () => {
    setLayout(DEFAULT_LAYOUT)
  }

  const today = new Date()
  const greeting = getGreeting(today.getHours())
  const dateStr = today.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })

  return (
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
            <div className="flex gap-2 items-center">
              {isEditMode && (
                <>
                  <button
                    onClick={saveLayout}
                    className="theme-toggle"
                    title="Save layout"
                    aria-label="Save layout"
                  >
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                      <polyline points="17 21 17 13 7 13 7 21" />
                      <polyline points="7 3 7 8 15 8" />
                    </svg>
                  </button>
                  <button
                    onClick={resetLayout}
                    className="theme-toggle"
                    title="Reset layout"
                    aria-label="Reset layout"
                  >
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="23 4 23 10 17 10" />
                      <path d="M20.49 15a9 9 0 1 1-2-8.83" />
                    </svg>
                  </button>
                </>
              )}
              <button
                onClick={() => setIsEditMode(!isEditMode)}
                className="theme-toggle"
                title={`${isEditMode ? 'Done' : 'Edit'} layout`}
                aria-label={`${isEditMode ? 'Done' : 'Edit'} layout`}
              >
                {isEditMode ? (
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                )}
              </button>
              <button
                onClick={toggleTheme}
                className="theme-toggle"
                aria-label="Toggle dark mode"
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                {theme === 'light' ? (
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
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

        <div className={`dashboard-grid-container ${isEditMode ? 'edit-mode' : ''}`}>
          <GridLayout
            className="dashboard-grid"
            layout={layout}
            onLayoutChange={handleLayoutChange}
            width={containerWidth}
            compactType="vertical"
            preventCollision={false}
            containerPadding={[16, 16]}
            margin={[16, 16]}
            cols={12}
            rowHeight={30}
            {...({
              static: !isEditMode,
              useCSSTransforms: true,
              isDraggable: isEditMode,
              isResizable: isEditMode,
            } as any)}
          >
            {layout.map((item: any) => {
              const Component = WIDGET_COMPONENTS[item.i]
              return (
                <div key={item.i} className={`grid-item ${isEditMode ? 'draggable' : ''}`}>
                  {isEditMode && <div className="resize-handle" />}
                  <Component />
                </div>
              )
            })}
          </GridLayout>
        </div>
      </main>
    </div>
  )
}

export default App
