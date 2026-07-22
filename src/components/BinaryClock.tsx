import { useEffect, useState } from 'react'
import { Card } from './Card'

// Same format as the Binary Bloom Clock (lanthanum89/binary-clock): each unit
// splits into tens/ones decimal digits, each digit shown as its own column
// of 4 dots (8-4-2-1, top to bottom) — binary-coded decimal, not raw binary
// of the whole number. Always 24-hour.
const BIT_VALUES = [8, 4, 2, 1]

function digitBits(digit: number): boolean[] {
  return BIT_VALUES.map((value) => (digit & value) !== 0)
}

function DigitColumn({ digit }: { digit: number }) {
  return (
    <div className="flex flex-col gap-1.5">
      {digitBits(digit).map((on, i) => (
        <span
          key={i}
          className={`h-3 w-3 rounded-full border ${
            on
              ? 'border-accent-bright bg-accent-bright shadow-[0_0_8px_rgba(203,186,240,0.8)]'
              : 'border-line'
          }`}
        />
      ))}
    </div>
  )
}

function UnitBlock({ label, value }: { label: string; value: number }) {
  const tens = Math.floor(value / 10)
  const ones = value % 10
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex gap-2">
        <DigitColumn digit={tens} />
        <DigitColumn digit={ones} />
      </div>
      <span className="font-mono text-[0.6rem] tracking-widest text-dim uppercase">{label}</span>
    </div>
  )
}

export function BinaryClock() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <Card className="flex flex-col items-center gap-3">
      <h2 className="font-display text-lg text-muted">Binary</h2>
      <div className="flex gap-4">
        <UnitBlock label="H" value={now.getHours()} />
        <UnitBlock label="M" value={now.getMinutes()} />
        <UnitBlock label="S" value={now.getSeconds()} />
      </div>
    </Card>
  )
}
