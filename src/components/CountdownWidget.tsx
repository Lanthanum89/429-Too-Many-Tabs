import { useState, type ReactNode } from 'react'
import { Card } from './Card'
import { ConfettiBurst } from './Doodles'

const STORAGE_KEY = 'life-dashboard:countdown'

interface CountdownConfig {
  label: string
  targetDate: string // YYYY-MM-DD
  // Optional because configs saved before the progress ring existed won't
  // have it - the ring just doesn't render for those until re-set, rather
  // than faking a start date that'd throw the progress off.
  createdAt?: string
}

function loadConfig(): CountdownConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as CountdownConfig) : null
  } catch {
    return null
  }
}

// Date-only diff (not a raw ms subtraction) so "today" and the target date
// compare by calendar day regardless of what time of day it currently is.
function daysBetween(from: Date, to: Date): number {
  const msPerDay = 86400000
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate())
  return Math.round((b - a) / msPerDay)
}

export function CountdownWidget() {
  const [config, setConfig] = useState<CountdownConfig | null>(loadConfig)
  const [label, setLabel] = useState('')
  const [date, setDate] = useState('')

  function save() {
    if (!date) return
    const next: CountdownConfig = {
      label: label.trim() || 'the big day',
      targetDate: date,
      createdAt: new Date().toISOString().slice(0, 10),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    setConfig(next)
  }

  function change() {
    setLabel(config?.label ?? '')
    setDate(config?.targetDate ?? '')
    setConfig(null)
  }

  return (
    <Card className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-mono text-lg font-bold text-accent-neon">Countdown</h2>
        {config && (
          <button onClick={change} className="text-xs text-dim hover:text-accent-bright">
            Change
          </button>
        )}
      </div>
      {config ? (
        <CountdownDisplay config={config} />
      ) : (
        <div className="flex min-h-0 flex-1 flex-wrap content-center items-center gap-2">
          <input
            type="text"
            placeholder="Days until…"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="min-w-0 flex-1 border border-line bg-transparent px-2 py-1.5 text-sm text-ink placeholder:text-dim focus:border-accent-neon focus:outline-none"
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-line bg-transparent px-2 py-1.5 text-sm text-ink focus:border-accent-neon focus:outline-none"
          />
          <button
            onClick={save}
            disabled={!date}
            className="border-2 border-accent-neon bg-transparent px-3 py-1.5 text-sm font-semibold text-accent-neon transition-all hover:bg-accent-neon hover:text-void disabled:opacity-50"
          >
            Set
          </button>
        </div>
      )}
    </Card>
  )
}

// A ring circumference of 100 makes strokeDasharray/strokeDashoffset just
// read as percentages directly, no circle-math needed inline below.
const RING_CIRCUMFERENCE = 100

function CountdownRing({ progress, isToday, children }: { progress: number | null; isToday: boolean; children: ReactNode }) {
  return (
    <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
      {progress !== null && (
        <svg viewBox="0 0 36 36" className="absolute inset-0 h-full w-full -rotate-90">
          <circle cx="18" cy="18" r="15.9155" fill="none" strokeWidth="2.5" className="stroke-line" />
          <circle
            cx="18"
            cy="18"
            r="15.9155"
            fill="none"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={RING_CIRCUMFERENCE * (1 - progress)}
            className={`transition-[stroke-dashoffset] duration-700 ease-bounce ${
              isToday ? 'stroke-accent-neon' : 'stroke-accent'
            }`}
          />
        </svg>
      )}
      {children}
    </div>
  )
}

function CountdownDisplay({ config }: { config: CountdownConfig }) {
  const diff = daysBetween(new Date(), new Date(`${config.targetDate}T00:00:00`))
  const isToday = diff === 0
  const isSoon = diff > 0 && diff <= 3

  // Progress toward the target since the countdown was set - null (no
  // ring) for configs saved before createdAt existed, or once the target
  // has passed (diff < 0), where "progress" no longer means anything.
  let progress: number | null = null
  if (config.createdAt && diff >= 0) {
    const totalDays = daysBetween(new Date(`${config.createdAt}T00:00:00`), new Date(`${config.targetDate}T00:00:00`))
    progress = totalDays > 0 ? Math.min(1, Math.max(0, 1 - diff / totalDays)) : 1
  }

  return (
    <div className="flex min-h-0 flex-1 flex-wrap content-center items-center gap-3">
      {isToday && (
        <span className="animate-bounce text-4xl" aria-hidden="true">
          🎉
        </span>
      )}
      <CountdownRing progress={progress} isToday={isToday}>
        {isToday && <ConfettiBurst />}
        <span className={`font-clock text-3xl font-bold leading-none text-accent-neon ${isSoon ? 'animate-pulse' : ''}`}>
          {Math.abs(diff)}
        </span>
      </CountdownRing>
      <span className="text-base text-muted">
        {isToday ? `${config.label} is today!` : diff > 0 ? `days until ${config.label}` : `days since ${config.label}`}
        {isSoon && ' — nearly there!'}
      </span>
    </div>
  )
}
