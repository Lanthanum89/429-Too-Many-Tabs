import { useEffect, useRef, useState } from 'react'
import { Card } from './Card'
import { fetchGithubActivity, formatRelativeTime, type GithubActivity } from '../lib/github'
import { useRegisterRefresh } from '../lib/useRegisterRefresh'
import { formatUpdated, useRelativeTimeTick } from '../lib/formatUpdated'
import { RefreshButton } from './RefreshButton'

const REFRESH_INTERVAL_MS = 15 * 60 * 1000

export function GithubWidget() {
  const [activity, setActivity] = useState<GithubActivity | null>(null)
  const [error, setError] = useState<string | null>(null)

  const mountedRef = useRef(true)
  useEffect(
    () => () => {
      mountedRef.current = false
    },
    [],
  )

  async function load(): Promise<boolean> {
    try {
      const data = await fetchGithubActivity()
      if (!mountedRef.current) return false
      setActivity(data)
      setError(null)
      return true
    } catch (err) {
      if (mountedRef.current) setError(err instanceof Error ? err.message : 'Failed to load GitHub activity')
      return false
    }
  }

  const { refreshing, lastUpdated, refresh } = useRegisterRefresh('github', load)
  useRelativeTimeTick()

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, REFRESH_INTERVAL_MS)
    return () => clearInterval(id)
  }, [refresh])

  return (
    <Card className="flex min-h-0 flex-1 flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-mono text-sm font-bold text-accent-neon">GitHub</h2>
        <div className="flex items-center gap-2">
          {activity && (
            <span className="text-xs text-dim">
              {activity.publicRepos} repos &middot; {activity.followers} followers
            </span>
          )}
          {lastUpdated && (
            <span className="hidden font-mono text-[10px] text-dim sm:inline">{formatUpdated(lastUpdated)}</span>
          )}
          <RefreshButton onClick={refresh} refreshing={refreshing} label="Refresh GitHub" />
        </div>
      </div>
      {activity ? (
        activity.recentEvents.length > 0 ? (
          <ul className="flex min-h-0 flex-1 flex-col divide-y divide-line overflow-y-auto">
            {activity.recentEvents.map((event) => (
              <li key={event.id} className="flex items-center justify-between gap-2 py-1">
                <span className="truncate text-sm text-ink">
                  {event.summary} <span className="text-dim">&middot; {event.repo}</span>
                </span>
                <span className="shrink-0 text-xs text-dim">{formatRelativeTime(event.createdAt)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-xs text-dim">No recent public activity.</span>
        )
      ) : error ? (
        <span className="text-xs text-danger">{error}</span>
      ) : (
        <span className="text-xs text-dim">Loading…</span>
      )}
    </Card>
  )
}
