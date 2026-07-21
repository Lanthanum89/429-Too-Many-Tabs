import type { ReactNode } from 'react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-lg border border-line border-t-2 border-t-mustard bg-walnut-light p-4 shadow-sm ${className}`}
    >
      {children}
    </div>
  )
}
