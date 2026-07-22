import { useEffect, useState } from 'react'
import { Card } from './Card'

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
}

function formatDate(date: Date): string {
  return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
}

export function Clock() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const [hours, minutes] = formatTime(now).split(':')

  return (
    <Card className="flex flex-col items-center justify-center border-2 border-line-strong text-center">
      <span
        className="font-clock leading-none tracking-wider text-accent-bright"
        style={{ fontSize: 'clamp(5rem, 18vw, 11rem)', textShadow: '0 0 28px rgba(170, 150, 216, 0.55)' }}
      >
        {hours}
        <span className="animate-pulse">:</span>
        {minutes}
      </span>
      <span className="font-display mt-2 text-sm tracking-[0.2em] text-muted uppercase">
        {formatDate(now)}
      </span>
    </Card>
  )
}
