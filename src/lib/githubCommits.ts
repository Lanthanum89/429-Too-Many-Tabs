const USERNAME = import.meta.env.VITE_GITHUB_USERNAME

export interface CommitDay {
  date: string // YYYY-MM-DD
  count: number
}

interface SearchCommitsResponse {
  items?: { commit?: { author?: { date?: string } } }[]
}

export function hasGithubUsername(): boolean {
  return Boolean(USERNAME)
}

function toDateKey(iso: string): string {
  return iso.slice(0, 10)
}

// GitHub's Search API only returns the most recent matches (up to 100 here,
// its own hard cap for a single unauthenticated page) — that's every commit
// this account has made *recently* across all public repos, not a full
// year like GitHub's own profile contribution graph, but it's the only
// commit-level endpoint that's a plain CORS-enabled JSON API usable straight
// from a static site with no auth token to protect.
export async function fetchRecentCommitDays(): Promise<CommitDay[]> {
  if (!USERNAME) throw new Error('GitHub username not configured')

  const params = new URLSearchParams({
    q: `author:${USERNAME}`,
    sort: 'author-date',
    order: 'desc',
    per_page: '100',
  })
  const res = await fetch(`https://api.github.com/search/commits?${params}`, {
    headers: { Accept: 'application/vnd.github+json' },
  })
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`)

  const data = (await res.json()) as SearchCommitsResponse
  const counts = new Map<string, number>()
  for (const item of data.items ?? []) {
    const date = item.commit?.author?.date
    if (!date) continue
    const key = toDateKey(date)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  return [...counts.entries()].map(([date, count]) => ({ date, count }))
}
