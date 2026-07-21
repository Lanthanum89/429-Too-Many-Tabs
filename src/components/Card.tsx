import type { ReactNode } from 'react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-gray-800 bg-gray-900/60 p-4 shadow-sm ${className}`}>
      {children}
    </div>
  )
}
