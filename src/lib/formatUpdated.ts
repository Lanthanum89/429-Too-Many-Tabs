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
