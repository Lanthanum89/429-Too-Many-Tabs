// Hardcoded rather than read from VITE_GITHUB_USERNAME - it's a public
// username, not a secret, and wiring the env var through both build
// workflows (deploy-pages.yml, build-android.yml) plus a repo
// secret/variable kept silently not taking effect, so this is simpler.
const USERNAME = 'Lanthanum89'

export interface RecentEvent {
  id: string
  summary: string
  repo: string
  createdAt: string
}

export interface GithubActivity {
  commitsToday: number
  lastRepo: string | null
  publicRepos: number
  followers: number
  recentEvents: RecentEvent[]
}

interface GithubEvent {
  id: string
  type: string
  created_at: string
  repo?: { name: string }
  payload?: {
    commits?: unknown[]
    action?: string
    ref_type?: string
    pull_request?: { merged?: boolean }
  }
}

interface GithubProfile {
  public_repos?: number
  followers?: number
}

function isToday(iso: string): boolean {
  const d = new Date(iso)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

function repoShortName(fullName: string | undefined): string | null {
  if (!fullName) return null
  return fullName.split('/')[1] ?? fullName
}

// Turns a raw event into a short human summary - GitHub's public events
// feed covers far more than pushes (stars, forks, issues, PRs, releases),
// which is worth surfacing for "anything else to do with git" rather than
// filtering down to commits alone.
function summarizeEvent(event: GithubEvent): string | null {
  const commits = event.payload?.commits?.length ?? 0
  switch (event.type) {
    case 'PushEvent':
      return `Pushed ${commits} commit${commits === 1 ? '' : 's'}`
    case 'WatchEvent':
      return 'Starred'
    case 'ForkEvent':
      return 'Forked'
    case 'CreateEvent':
      return event.payload?.ref_type === 'repository' ? 'Created repo' : `Created ${event.payload?.ref_type ?? 'ref'}`
    case 'DeleteEvent':
      return `Deleted ${event.payload?.ref_type ?? 'ref'}`
    case 'PullRequestEvent':
      if (event.payload?.action === 'closed' && event.payload?.pull_request?.merged) return 'Merged PR'
      return event.payload?.action === 'opened' ? 'Opened PR' : `PR ${event.payload?.action ?? 'updated'}`
    case 'IssuesEvent':
      return event.payload?.action === 'opened' ? 'Opened issue' : `Issue ${event.payload?.action ?? 'updated'}`
    case 'IssueCommentEvent':
    case 'PullRequestReviewCommentEvent':
      return 'Commented'
    case 'ReleaseEvent':
      return 'Published release'
    default:
      return null
  }
}

// GitHub's public events feed (no auth needed for public activity) plus
// the public profile endpoint for repo/follower counts - both free, both
// CORS-friendly for direct browser fetches. A true contribution streak
// would need computing across full history, which this ~90-day events
// feed doesn't cover, so that's left out.
export async function fetchGithubActivity(): Promise<GithubActivity> {
  const [eventsRes, profileRes] = await Promise.all([
    fetch(`https://api.github.com/users/${USERNAME}/events/public`),
    fetch(`https://api.github.com/users/${USERNAME}`),
  ])
  if (!eventsRes.ok) throw new Error(`GitHub API error: ${eventsRes.status}`)

  const events = (await eventsRes.json()) as GithubEvent[]
  const pushEvents = events.filter((e) => e.type === 'PushEvent')

  const commitsToday = pushEvents
    .filter((e) => isToday(e.created_at))
    .reduce((sum, e) => sum + (e.payload?.commits?.length ?? 0), 0)

  const lastRepo = repoShortName(pushEvents[0]?.repo?.name)

  const recentEvents: RecentEvent[] = []
  for (const event of events) {
    const summary = summarizeEvent(event)
    if (!summary) continue
    recentEvents.push({ id: event.id, summary, repo: repoShortName(event.repo?.name) ?? 'unknown repo', createdAt: event.created_at })
    if (recentEvents.length >= 5) break
  }

  const profile = profileRes.ok ? ((await profileRes.json()) as GithubProfile) : {}

  return {
    commitsToday,
    lastRepo,
    publicRepos: profile.public_repos ?? 0,
    followers: profile.followers ?? 0,
    recentEvents,
  }
}

export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
