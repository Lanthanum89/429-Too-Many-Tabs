import { useEffect, useState } from 'react'
import { Card } from './Card'
import { fetchGithubActivity, formatRelativeTime, type DayActivity, type GithubActivity } from '../lib/github'

const REFRESH_INTERVAL_MS = 15 * 60 * 1000

// A compact GitHub-style contribution strip - 14 little squares, darker
// for more commits that day - rather than the full text feed being the
// only view into recent activity.
function GithubHeatmap({ days }: { days: DayActivity[] }) {
  const max = Math.max(1, ...days.map((day) => day.count))
  return (
    <div className="flex shrink-0 items-center gap-[3px]">
      {days.map((day, i) => (
        <span
          key={i}
          title={`${day.count} commit${day.count === 1 ? '' : 's'}`}
          className={`h-2.5 flex-1 rounded-sm ${day.count === 0 ? 'bg-line' : 'bg-accent-neon'} ${
            day.isToday ? 'ring-1 ring-accent-bright' : ''
          }`}
          style={day.count > 0 ? { opacity: 0.35 + (day.count / max) * 0.65 } : undefined}
        />
      ))}
    </div>
  )
}

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
    <Card className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-mono text-sm font-bold text-accent-neon">GitHub</h2>
        {activity && (
          <span className="text-xs text-dim">
            {activity.publicRepos} repos &middot; {activity.followers} followers
          </span>
        )}
      </div>
      {activity ? (
        <>
          <p className="flex items-center gap-1.5 text-xs text-dim">
            <span>
              {activity.commitsToday} commit{activity.commitsToday === 1 ? '' : 's'} today
              {activity.lastRepo && <span> &middot; last: {activity.lastRepo}</span>}
            </span>
            {activity.streakDays >= 2 && (
              <span className="rounded-full border border-accent-neon px-1.5 py-0.5 text-[10px] font-semibold text-accent-neon">
                🔥 {activity.streakDays} day streak
              </span>
            )}
          </p>
          <GithubHeatmap days={activity.dailyCommits} />
          {activity.recentEvents.length > 0 && (
            // Grows to fill whatever height the card ends up with (see
            // .dashboard-leftstack in index.css - GitHub's card now
            // flex-grows to match Radar's height) rather than a fixed
            // row cap, so extra room shows more real activity instead of
            // sitting empty. Scrolls if there's still more than fits.
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
          )}
        </>
      ) : error ? (
        <span className="text-xs text-danger">{error}</span>
      ) : (
        <span className="text-xs text-dim">Loading…</span>
      )}
    </Card>
  )
}
