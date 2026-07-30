import { useEffect, useState } from 'react'
import { Card } from './Card'

// Same format as the Binary Bloom Clock (lanthanum89/binary-clock): each unit
// splits into tens/ones decimal digits, each digit shown as its own column
// of 4 dots (8-4-2-1, top to bottom) — binary-coded decimal, not raw binary
// of the whole number. Always 24-hour.
const BIT_VALUES = [8, 4, 2, 1]

type Unit = 'hour' | 'min' | 'sec'

// Static (not templated) so Tailwind's scanner can find every class.
const UNIT_ON_CLASSES: Record<Unit, string> = {
  hour: 'border-clock-hour bg-clock-hour',
  min: 'border-clock-min bg-clock-min',
  sec: 'border-clock-sec bg-clock-sec',
}

function digitBits(digit: number): boolean[] {
  return BIT_VALUES.map((value) => (digit & value) !== 0)
}

function DigitColumn({ digit, unit }: { digit: number; unit: Unit }) {
  return (
    <div className="flex flex-col gap-2.5">
      {digitBits(digit).map((on, i) => (
        <span
          key={i}
          className={`h-5 w-5 rounded-full border-2 transition-all duration-300 ease-bounce ${
            on ? `scale-110 ${UNIT_ON_CLASSES[unit]}` : 'scale-100 border-line-strong bg-void'
          }`}
        />
      ))}
    </div>
  )
}

function UnitBlock({ label, unit, value }: { label: string; unit: Unit; value: number }) {
  const tens = Math.floor(value / 10)
  const ones = value % 10
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-3">
        <DigitColumn digit={tens} unit={unit} />
        <DigitColumn digit={ones} unit={unit} />
      </div>
      <span className="font-mono text-xs tracking-widest text-dim uppercase">{label}</span>
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
    <Card className="flex flex-col items-center justify-center gap-3">
      <div className="flex gap-6">
        <UnitBlock label="H" unit="hour" value={now.getHours()} />
        <UnitBlock label="M" unit="min" value={now.getMinutes()} />
        <UnitBlock label="S" unit="sec" value={now.getSeconds()} />
      </div>
    </Card>
  )
}
