const USERNAME = import.meta.env.VITE_GITHUB_USERNAME

export interface GithubActivity {
  commitsToday: number
  lastRepo: string | null
}

export function hasGithubUsername(): boolean {
  return Boolean(USERNAME)
}

interface GithubEvent {
  type: string
  created_at: string
  repo?: { name: string }
  payload?: { commits?: unknown[] }
}

function isToday(iso: string): boolean {
  const d = new Date(iso)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

// GitHub's public events feed (no auth needed for public activity) - the
// simplest thing it can give us directly is "commits pushed today" and
// "most recent repo pushed to"; a true contribution streak would need
// computing across the full history, which this ~90-day events feed
// doesn't cover.
export async function fetchGithubActivity(): Promise<GithubActivity> {
  const res = await fetch(`https://api.github.com/users/${USERNAME}/events/public`)
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`)

  const events = (await res.json()) as GithubEvent[]
  const pushEvents = events.filter((e) => e.type === 'PushEvent')

  const commitsToday = pushEvents
    .filter((e) => isToday(e.created_at))
    .reduce((sum, e) => sum + (e.payload?.commits?.length ?? 0), 0)

  const lastRepo = pushEvents[0]?.repo?.name?.split('/')[1] ?? null

  return { commitsToday, lastRepo }
}
