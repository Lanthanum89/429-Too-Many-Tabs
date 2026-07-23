import { useEffect, useState } from 'react'
import { Card } from './Card'

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}

function formatDate(date: Date): string {
  return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
}

function FlipDigit({ value, prevValue }: { value: string; prevValue: string }) {
  const isChanging = value !== prevValue

  return (
    <div className="flip-digit">
      <div className={`flip-card ${isChanging ? 'flipping' : ''}`}>
        <div className="flip-front">{prevValue}</div>
        <div className="flip-back">{value}</div>
      </div>
    </div>
  )
}

export function Clock() {
  const [now, setNow] = useState(() => new Date())
  const [prev, setPrev] = useState(() => new Date(now.getTime() - 1000))

  useEffect(() => {
    const id = setInterval(() => {
      setPrev(now)
      setNow(new Date())
    }, 1000)
    return () => clearInterval(id)
  }, [now])

  const timeStr = formatTime(now)
  const prevTimeStr = formatTime(prev)
  const [h1, h2, m1, m2, s1, s2] = timeStr.split('')
  const [ph1, ph2, pm1, pm2, ps1, ps2] = prevTimeStr.split('')

  return (
    <Card className="flex flex-col items-center justify-center text-center">
      <div className="flip-clock-container">
        <div className="flip-segment">
          <FlipDigit value={h1} prevValue={ph1} />
          <FlipDigit value={h2} prevValue={ph2} />
        </div>
        <div className="flip-separator" />
        <div className="flip-segment">
          <FlipDigit value={m1} prevValue={pm1} />
          <FlipDigit value={m2} prevValue={pm2} />
        </div>
        <div className="flip-separator" />
        <div className="flip-segment">
          <FlipDigit value={s1} prevValue={ps1} />
          <FlipDigit value={s2} prevValue={ps2} />
        </div>
      </div>
    </Card>
  )
}
