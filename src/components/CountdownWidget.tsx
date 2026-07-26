import { useState } from 'react'
import { Card } from './Card'

const STORAGE_KEY = 'life-dashboard:countdown'

interface CountdownConfig {
  label: string
  targetDate: string // YYYY-MM-DD
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
    const next: CountdownConfig = { label: label.trim() || 'the big day', targetDate: date }
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

function CountdownDisplay({ config }: { config: CountdownConfig }) {
  const diff = daysBetween(new Date(), new Date(`${config.targetDate}T00:00:00`))

  return (
    <div className="flex min-h-0 flex-1 flex-wrap content-center items-center gap-3">
      <span className="font-clock text-5xl font-black leading-none text-accent-neon">{Math.abs(diff)}</span>
      <span className="text-base text-muted">
        {diff === 0 ? `${config.label} is today!` : diff > 0 ? `days until ${config.label}` : `days since ${config.label}`}
      </span>
    </div>
  )
}
