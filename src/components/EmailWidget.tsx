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
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  async function connect() {
    setLoading(true)
    setError(null)
    try {
      const [starred, page, unread] = await Promise.all([
        fetchAllStarredMessages(),
        fetchInboxMessages(),
        fetchInboxUnreadCount(),
      ])
      setMessages(mergeMessages(starred, page.messages))
      setNextPageToken(page.nextPageToken)
      setUnreadCount(unread)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load email')
    } finally {
      setLoading(false)
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

  return (
    <Card className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center gap-2">
        <h2 className="font-mono text-lg font-bold text-accent-neon">Email</h2>
        {!!unreadCount && (
          <span className="rounded-full bg-accent-neon px-2 py-0.5 text-xs font-semibold text-void">
            {unreadCount} unread
          </span>
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
        <ul className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {messages.length === 0 && <li className="text-sm text-dim">Inbox empty.</li>}
          {messages.map((message) => (
            <li key={message.id}>
              <a
                href={gmailMessageUrl(message.id)}
                target="_blank"
                rel="noreferrer"
                className="flex w-full items-start gap-2 py-1.5 text-left hover:text-accent-bright"
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
                  <span
                    className={`block truncate text-xs ${message.unread ? 'font-medium text-ink' : 'text-dim'}`}
                    title={message.from}
                  >
                    {fromDisplayName(message.from)}
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
