import { useEffect, useState } from 'react'
import { Card } from './Card'
import { fetchGithubActivity, formatRelativeTime, type GithubActivity } from '../lib/github'

const REFRESH_INTERVAL_MS = 15 * 60 * 1000

export function GithubWidget() {
  const [activity, setActivity] = useState<GithubActivity | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const data = await fetchGithubActivity()
        if (!cancelled) {
          setActivity(data)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load GitHub activity')
      }
    }

    load()
    const id = setInterval(load, REFRESH_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  return (
    <Card className="flex min-h-0 flex-1 flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-mono text-sm font-bold text-accent-neon">GitHub</h2>
        {activity && (
          <span className="text-xs text-dim">
            {activity.publicRepos} repos &middot; {activity.followers} followers
          </span>
        )}
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
