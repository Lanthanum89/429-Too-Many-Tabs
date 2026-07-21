import { useEffect, useState } from 'react'
import { Card } from './Card'
import type { WidgetSize } from '../theme/modes'

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
}

function formatDate(date: Date): string {
  return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
}

export function Clock({ size }: { size: Exclude<WidgetSize, 'hidden'> }) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const timeClass = size === 'lg' ? 'text-6xl' : size === 'md' ? 'text-4xl' : 'text-2xl'

  return (
    <Card className="flex flex-col items-center justify-center text-center">
      <span className={`font-display font-semibold tabular-nums text-cream ${timeClass}`}>
        {formatTime(now)}
      </span>
      {size !== 'sm' && (
        <span className="mt-1 text-sm tracking-wide text-tan uppercase">{formatDate(now)}</span>
      )}
    </Card>
  )
}
