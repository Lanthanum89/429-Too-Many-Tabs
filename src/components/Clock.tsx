import { useEffect, useState } from 'react'
import { Card } from './Card'

function padZero(num: number): string {
  return String(num).padStart(2, '0')
}

function FlipDigit({ value, prevValue }: { value: string; prevValue: string }) {
  const isChanging = value !== prevValue

  return (
    <div className="flip-digit">
      {/* key={value} forces a fresh element every time the digit changes -
          without it, isChanging stays true continuously once a digit is
          ticking every second (this render's prevValue is always last
          render's value), so the 'flipping' class never actually leaves
          and re-joins and the CSS animation below never restarts: only
          the very first change ever plays, everything after is a silent
          text swap frozen at rotateX(180deg). Remounting guarantees the
          animation replays from its 0% keyframe on every single change. */}
      <div key={value} className={`flip-card ${isChanging ? 'flipping' : ''}`}>
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

  // Extract digits directly from date object
  const h = padZero(now.getHours())
  const m = padZero(now.getMinutes())
  const s = padZero(now.getSeconds())
  const ph = padZero(prev.getHours())
  const pm = padZero(prev.getMinutes())
  const ps = padZero(prev.getSeconds())

  const [h1, h2] = h.split('')
  const [m1, m2] = m.split('')
  const [s1, s2] = s.split('')
  const [ph1, ph2] = ph.split('')
  const [pm1, pm2] = pm.split('')
  const [ps1, ps2] = ps.split('')

  return (
    <Card className="flex flex-col items-center justify-center text-center">
      <div className="flip-clock-container">
        <div className="flip-segment">
          <FlipDigit value={h1} prevValue={ph1} />
          <FlipDigit value={h2} prevValue={ph2} />
        </div>
        <div className="flip-separator">:</div>
        <div className="flip-segment">
          <FlipDigit value={m1} prevValue={pm1} />
          <FlipDigit value={m2} prevValue={pm2} />
        </div>
        <div className="flip-separator">:</div>
        <div className="flip-segment">
          <FlipDigit value={s1} prevValue={ps1} />
          <FlipDigit value={s2} prevValue={ps2} />
        </div>
      </div>
    </Card>
  )
}
