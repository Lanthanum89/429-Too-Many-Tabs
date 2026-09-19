import { useEffect, useReducer } from 'react'

// "Updated" prefix baked in since every call site wants it - keeps the
// three-tier format (just now / Nm ago / clock time) in one place instead of
// each widget re-deriving its own threshold.
export function formatUpdated(date: Date | null): string {
  if (!date) return ''
  const diffMs = Date.now() - date.getTime()
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'Updated just now'
  if (minutes < 60) return `Updated ${minutes}m ago`
  return `Updated ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
}

// formatUpdated reads Date.now() only at render time - without something
// scheduling a re-render as time passes, a label frozen mid-render (e.g.
// "Updated just now") would sit there unchanged for minutes until some
// unrelated state update happened to touch the component again. Any
// component displaying a formatUpdated() label should also call this once,
// which forces a re-render every 30s purely so the label keeps advancing on
// its own; it has no other effect. 30s is granular enough for the "Nm ago"
// tier without a highly-visible per-second ticker.
export function useRelativeTimeTick(intervalMs = 30_000): void {
  const [, forceRender] = useReducer((n: number) => n + 1, 0)
  useEffect(() => {
    const id = setInterval(forceRender, intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
}
