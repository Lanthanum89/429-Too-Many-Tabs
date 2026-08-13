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
  publicRepos: number
  followers: number
  recentEvents: RecentEvent[]
}

const MAX_EVENTS = 8

interface GithubEvent {
  id: string
  type: string
  created_at: string
  repo?: { name: string }
  payload?: {
    commits?: unknown[]
    // The events API's `commits` array is frequently empty (GitHub trims
    // it for large or older pushes) even though the push itself had
    // commits - distinct_size/size are the actual counts and stay
    // populated regardless, so they're the reliable source, with
    // commits.length only as a last-resort fallback.
    distinct_size?: number
    size?: number
    action?: string
    ref_type?: string
    pull_request?: { merged?: boolean }
  }
}

function pushCommitCount(event: GithubEvent): number {
  return event.payload?.distinct_size ?? event.payload?.size ?? event.payload?.commits?.length ?? 0
}

interface GithubProfile {
  public_repos?: number
  followers?: number
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
  const commits = pushCommitCount(event)
  switch (event.type) {
    case 'PushEvent':
      // GitHub often reports 0 here for pushes it's already seen part of
      // (rebased/force-pushed history, merge commits) even though real
      // work happened - "Pushed" alone reads as activity either way,
      // rather than a misleading "Pushed 0 commits".
      return commits > 0 ? `Pushed ${commits} commit${commits === 1 ? '' : 's'}` : 'Pushed'
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
// CORS-friendly for direct browser fetches.
export async function fetchGithubActivity(): Promise<GithubActivity> {
  const [eventsRes, profileRes] = await Promise.all([
    fetch(`https://api.github.com/users/${USERNAME}/events/public`),
    fetch(`https://api.github.com/users/${USERNAME}`),
  ])
  if (!eventsRes.ok) throw new Error(`GitHub API error: ${eventsRes.status}`)

  const events = (await eventsRes.json()) as GithubEvent[]

  const recentEvents: RecentEvent[] = []
  for (const event of events) {
    const summary = summarizeEvent(event)
    if (!summary) continue
    recentEvents.push({ id: event.id, summary, repo: repoShortName(event.repo?.name) ?? 'unknown repo', createdAt: event.created_at })
    if (recentEvents.length >= MAX_EVENTS) break
  }

  const profile = profileRes.ok ? ((await profileRes.json()) as GithubProfile) : {}

  return {
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
