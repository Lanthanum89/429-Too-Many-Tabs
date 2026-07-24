import { useEffect, useState } from 'react'
import { Card } from './Card'
import {
  fetchAllStarredMessages,
  fetchInboxMessages,
  fetchInboxUnreadCount,
  fromDisplayName,
  hasValidGmailToken,
  sortInboxMessages,
  type InboxMessage,
} from '../lib/gmail'

function gmailMessageUrl(id: string): string {
  return `https://mail.google.com/mail/u/0/#inbox/${id}`
}

function formatReceived(internalDate: number): string {
  const date = new Date(internalDate)
  const now = new Date()
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  return sameDay
    ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

// Merges the "all starred" fetch with a regular inbox page, so a starred
// message is never hidden behind "Load more" — later pages (via loadMore)
// dedupe against this same set so a starred message already shown up top
// doesn't also reappear further down once its regular page comes in.
function mergeMessages(starred: InboxMessage[], page: InboxMessage[]): InboxMessage[] {
  const byId = new Map<string, InboxMessage>()
  for (const message of starred) byId.set(message.id, message)
  for (const message of page) if (!byId.has(message.id)) byId.set(message.id, message)
  return sortInboxMessages([...byId.values()])
}

export function EmailWidget() {
  const [messages, setMessages] = useState<InboxMessage[] | null>(null)
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined)
  const [unreadCount, setUnreadCount] = useState<number | null>(null)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [starredOnly, setStarredOnly] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  async function connect() {
    setLoading(true)
    setError(null)
    try {
      const [starred, page] = await Promise.all([fetchAllStarredMessages(), fetchInboxMessages()])
      setMessages(mergeMessages(starred, page.messages))
      setNextPageToken(page.nextPageToken)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load email')
      setLoading(false)
      return
    }
    setLoading(false)

    // Kept separate from the fetch above on purpose: this is a nice-to-have
    // badge, not core to the widget working, so a failure here (rate limit,
    // a transient API hiccup) shouldn't take the whole message list down
    // with it — it just leaves the badge off.
    try {
      setUnreadCount(await fetchInboxUnreadCount())
    } catch {
      setUnreadCount(null)
    }
  }

  async function loadMore() {
    if (!nextPageToken) return
    setLoadingMore(true)
    setError(null)
    try {
      const page = await fetchInboxMessages(nextPageToken)
      setMessages((prev) => mergeMessages(prev ?? [], page.messages))
      setNextPageToken(page.nextPageToken)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more email')
    } finally {
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    if (hasValidGmailToken()) connect()
  }, [])

  const starredCount = (messages ?? []).filter((message) => message.starred).length
  const visibleMessages = (messages ?? []).filter(
    (message) => (!unreadOnly || message.unread) && (!starredOnly || message.starred),
  )

  return (
    <Card className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center gap-2">
        <h2 className="font-mono text-lg font-bold text-accent-neon">Email</h2>
        {unreadCount !== null && (
          <button
            onClick={() => unreadCount > 0 && setUnreadOnly((v) => !v)}
            aria-pressed={unreadOnly}
            disabled={unreadCount === 0}
            title={
              unreadCount === 0 ? 'No unread messages' : unreadOnly ? 'Show all messages' : 'Show only unread'
            }
            className={`rounded-full border-2 px-2 py-0.5 text-xs font-semibold transition-colors ${
              unreadCount === 0
                ? 'border-line bg-transparent text-dim'
                : unreadOnly
                  ? 'border-accent-bright bg-accent-bright text-void'
                  : 'border-accent-neon bg-transparent text-accent-neon hover:bg-accent-neon hover:text-void'
            }`}
          >
            {unreadCount} unread
          </button>
        )}
        {messages !== null && (
          <button
            onClick={() => starredCount > 0 && setStarredOnly((v) => !v)}
            aria-pressed={starredOnly}
            disabled={starredCount === 0}
            title={
              starredCount === 0 ? 'No starred messages' : starredOnly ? 'Show all messages' : 'Show only starred'
            }
            className={`rounded-full border-2 px-2 py-0.5 text-xs font-semibold transition-colors ${
              starredCount === 0
                ? 'border-line bg-transparent text-dim'
                : starredOnly
                  ? 'border-accent-bright bg-accent-bright text-void'
                  : 'border-accent-neon bg-transparent text-accent-neon hover:bg-accent-neon hover:text-void'
            }`}
          >
            {starredCount} starred
          </button>
        )}
      </div>
      {messages === null ? (
        <button
          onClick={connect}
          disabled={loading}
          className="self-start border-2 border-accent-neon bg-transparent px-4 py-1.5 text-sm font-semibold text-accent-neon hover:bg-accent-neon hover:text-void disabled:opacity-50 transition-all"
        >
          {loading ? 'Connecting…' : 'Connect Gmail'}
        </button>
      ) : (
        <ul className="flex min-h-0 flex-1 flex-col divide-y divide-line overflow-y-auto pr-2">
          {visibleMessages.length === 0 && (
            <li className="text-sm text-dim">
              {unreadOnly && starredOnly
                ? 'No unread starred messages loaded.'
                : unreadOnly
                  ? 'No unread messages loaded.'
                  : starredOnly
                    ? 'No starred messages.'
                    : 'Inbox empty.'}
            </li>
          )}
          {visibleMessages.map((message) => (
            <li key={message.id}>
              <a
                href={gmailMessageUrl(message.id)}
                target="_blank"
                rel="noreferrer"
                className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-surface-2 hover:text-accent-bright"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="12"
                  height="12"
                  className={`mt-1 shrink-0 ${message.starred ? 'fill-accent-bright' : 'fill-none stroke-dim'}`}
                  strokeWidth="1.5"
                >
                  <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.8-6.2 3.8 1.6-7L2 9.2l7.1-.6z" />
                </svg>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span
                      className={`truncate text-xs ${message.unread ? 'font-medium text-ink' : 'text-dim'}`}
                      title={message.from}
                    >
                      {fromDisplayName(message.from)}
                    </span>
                    <span className="shrink-0 text-[10px] text-dim">{formatReceived(message.internalDate)}</span>
                  </span>
                  <span
                    className={`block truncate text-sm ${message.unread ? 'font-semibold text-ink' : 'text-muted'}`}
                    title={message.subject}
                  >
                    {message.subject}
                  </span>
                </span>
              </a>
            </li>
          ))}
          {nextPageToken && (
            <li className="pt-2 text-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="text-xs text-accent hover:text-accent-bright disabled:opacity-50"
              >
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            </li>
          )}
        </ul>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </Card>
  )
}
