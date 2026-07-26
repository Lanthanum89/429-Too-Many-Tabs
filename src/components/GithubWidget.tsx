import { useEffect, useState } from 'react'
import { Card } from './Card'
import { fetchGithubActivity, hasGithubUsername, type GithubActivity } from '../lib/github'

const REFRESH_INTERVAL_MS = 15 * 60 * 1000

export function GithubWidget() {
  const [activity, setActivity] = useState<GithubActivity | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!hasGithubUsername()) return undefined

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
    <Card className="flex flex-row items-center justify-between gap-2 py-3">
      <h2 className="font-mono text-sm font-bold text-accent-neon">GitHub</h2>
      {!hasGithubUsername() ? (
        <span className="text-xs text-dim">Set VITE_GITHUB_USERNAME</span>
      ) : activity ? (
        <span className="truncate text-sm text-ink">
          {activity.commitsToday} commit{activity.commitsToday === 1 ? '' : 's'} today
          {activity.lastRepo && <span className="text-dim"> &middot; last: {activity.lastRepo}</span>}
        </span>
      ) : error ? (
        <span className="text-xs text-danger">{error}</span>
      ) : (
        <span className="text-xs text-dim">Loading…</span>
      )}
    </Card>
  )
}
