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
      <span className="clock-display font-clock font-black leading-none tracking-tight text-accent-neon">
        {hours}
        <span className="animate-pulse">:</span>
        {minutes}
      </span>
      <span className="font-mono mt-2 text-sm tracking-[0.2em] text-muted uppercase">
        {formatDate(now)}
      </span>
    </Card>
  )
}
