import { useEffect, useRef, useState } from 'react'
import { Card } from './Card'
import { fetchTopHeadlines, hasGuardianKey, type GuardianHeadline } from '../lib/guardian'
import { useRegisterRefresh } from '../lib/useRegisterRefresh'
import { formatUpdated, useRelativeTimeTick } from '../lib/formatUpdated'
import { RefreshButton } from './RefreshButton'

const REFRESH_INTERVAL_MS = 15 * 60 * 1000

export function GuardianWidget() {
  const [headlines, setHeadlines] = useState<GuardianHeadline[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const hasKey = hasGuardianKey()

  const mountedRef = useRef(true)
  useEffect(
    () => () => {
      mountedRef.current = false
    },
    [],
  )

  async function load(): Promise<boolean> {
    try {
      const data = await fetchTopHeadlines()
      if (!mountedRef.current) return false
      setHeadlines(data)
      setError(null)
      return true
    } catch (err) {
      if (mountedRef.current) setError(err instanceof Error ? err.message : 'Failed to load headlines')
      return false
    }
  }

  const { refreshing, lastUpdated, refresh } = useRegisterRefresh('guardian', load, hasKey)
  useRelativeTimeTick()

  useEffect(() => {
    if (!hasKey) return undefined
    refresh()
    const id = setInterval(refresh, REFRESH_INTERVAL_MS)
    return () => clearInterval(id)
  }, [hasKey, refresh])

  return (
    <Card className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-mono text-lg font-bold text-accent-neon">Guardian Headlines</h2>
        {hasKey && (
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="hidden font-mono text-[10px] text-dim sm:inline">{formatUpdated(lastUpdated)}</span>
            )}
            <RefreshButton onClick={refresh} refreshing={refreshing} label="Refresh Guardian Headlines" />
          </div>
        )}
      </div>
      {!hasKey ? (
        <p className="text-xs text-dim">Set VITE_GUARDIAN_API_KEY to show headlines.</p>
      ) : headlines === null ? (
        error ? (
          <p className="text-xs text-danger">{error}</p>
        ) : (
          <p className="text-sm text-dim">Loading…</p>
        )
      ) : (
        // Container height stays capped at 253px regardless of how many
        // lines a headline wraps to (see line-clamp-2 below), so a longer
        // title just means fewer rows fit before the rest scrolls into view.
        <ul className="flex max-h-[253px] min-h-0 flex-col overflow-y-auto">
          {headlines.length === 0 && <li className="text-sm text-dim">No headlines.</li>}
          {headlines.map((item) => (
            <li key={item.id}>
              <a
                href={item.webUrl}
                target="_blank"
                rel="noreferrer"
                className="flex flex-col gap-0.5 rounded-none px-2 py-1.5 hover:bg-accent-neon/15 hover:text-accent-bright"
              >
                <span className="truncate text-[11px] uppercase tracking-wide text-dim">{item.sectionName}</span>
                <span className="line-clamp-2 text-sm font-medium text-ink">{item.webTitle}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
      {error && headlines !== null && <p className="text-xs text-danger">{error}</p>}
    </Card>
  )
}
