import type { CSSProperties, ReactNode, TouchEventHandler } from 'react'

export function Card({
  children,
  className = '',
  style,
  onTouchStart,
  onTouchEnd,
}: {
  children: ReactNode
  className?: string
  style?: CSSProperties
  onTouchStart?: TouchEventHandler<HTMLDivElement>
  onTouchEnd?: TouchEventHandler<HTMLDivElement>
}) {
  return (
    <div
      className={`card border border-line bg-surface p-6 ${className}`}
      style={style}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {children}
    </div>
  )
}
