import { useEffect, useMemo, useState } from 'react'
import { Card } from './Card'
import { fetchRecentCommitDays, hasGithubUsername, type CommitDay } from '../lib/githubCommits'

const REFRESH_INTERVAL_MS = 15 * 60 * 1000
const WEEKS = 10

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

// Builds a GitHub-style grid: columns are weeks (oldest to newest, left to
// right), rows are Sun-Sat, ending on today — same layout convention as the
// profile contribution graph, just over however many recent weeks the
// Search API's 100-commit window happens to cover rather than a full year.
function buildWeeks(counts: Map<string, number>): CommitDay[][] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const daysSinceSunday = today.getDay()
  const gridEnd = new Date(today)
  gridEnd.setDate(gridEnd.getDate() + (6 - daysSinceSunday))

  const weeks: CommitDay[][] = []
  for (let w = WEEKS - 1; w >= 0; w--) {
    const week: CommitDay[] = []
    for (let d = 0; d < 7; d++) {
      const day = new Date(gridEnd)
      day.setDate(day.getDate() - w * 7 - (6 - d))
      const key = toDateKey(day)
      week.push({ date: key, count: day > today ? -1 : (counts.get(key) ?? 0) })
    }
    weeks.push(week)
  }
  return weeks
}

function levelClass(count: number): string {
  if (count < 0) return 'invisible'
  if (count === 0) return 'border-line-strong bg-void'
  if (count === 1) return 'border-accent-neon bg-accent-neon/30'
  if (count <= 3) return 'border-accent-neon bg-accent-neon/65'
  return 'border-accent-neon bg-accent-neon'
}

export function CommitGraphWidget() {
  const [days, setDays] = useState<CommitDay[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!hasGithubUsername()) return undefined

    let cancelled = false

    async function load() {
      try {
        const data = await fetchRecentCommitDays()
        if (!cancelled) {
          setDays(data)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load commits')
      }
    }

    load()
    const id = setInterval(load, REFRESH_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  const weeks = useMemo(() => {
    if (!days) return null
    const counts = new Map(days.map((d) => [d.date, d.count]))
    return buildWeeks(counts)
  }, [days])

  const total = days?.reduce((sum, d) => sum + d.count, 0) ?? 0

  return (
    <Card className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3">
      <h2 className="font-mono text-lg font-bold text-accent-neon">Commits</h2>
      {!hasGithubUsername() ? (
        <p className="text-xs text-dim">Set VITE_GITHUB_USERNAME to show commit activity.</p>
      ) : weeks === null ? (
        error ? (
          <p className="text-xs text-danger">{error}</p>
        ) : (
          <p className="text-sm text-dim">Loading…</p>
        )
      ) : (
        <>
          <div className="flex gap-1">
            {weeks.map((week, i) => (
              <div key={i} className="flex flex-col gap-1">
                {week.map((day, j) => (
                  <span
                    key={j}
                    title={day.count >= 0 ? `${day.count} commit${day.count === 1 ? '' : 's'} on ${day.date}` : undefined}
                    className={`h-2.5 w-2.5 rounded-sm border ${levelClass(day.count)}`}
                  />
                ))}
              </div>
            ))}
          </div>
          <span className="text-[11px] text-dim">{total} commits, last {WEEKS} weeks</span>
        </>
      )}
      {error && weeks !== null && <p className="text-xs text-danger">{error}</p>}
    </Card>
  )
}
