import type { CSSProperties, ReactNode } from 'react'

export function Card({
  children,
  className = '',
  style,
}: {
  children: ReactNode
  className?: string
  style?: CSSProperties
}) {
  return (
    <div className={`card rounded-2xl border border-line bg-surface p-6 shadow-lg ${className}`} style={style}>
      {children}
    </div>
  )
}
