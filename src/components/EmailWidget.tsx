import { useEffect, useState } from 'react'
import { Card } from './Card'
import { fetchUnreadMessages, hasValidGmailToken, type UnreadMessage } from '../lib/gmail'

// Gmail's web UI accepts a message ID directly in the URL fragment — no extra
// API scope needed beyond the gmail.readonly one already used to fetch it.
// Messages were fetched with `in:inbox`, so the inbox view is always correct.
function gmailMessageUrl(id: string): string {
  return `https://mail.google.com/mail/u/0/#inbox/${id}`
}

export function EmailWidget() {
  const [messages, setMessages] = useState<UnreadMessage[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function connect() {
    setLoading(true)
    setError(null)
    try {
      setMessages(await fetchUnreadMessages(10))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load email')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (hasValidGmailToken()) connect()
  }, [])

  return (
    <Card className="flex min-h-0 flex-1 flex-col gap-3">
      <h2 className="font-display text-sm tracking-wide text-muted uppercase">Email</h2>
      {messages === null ? (
        <button
          onClick={connect}
          disabled={loading}
          className="self-start rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-void hover:bg-accent-bright disabled:opacity-50"
        >
          {loading ? 'Connecting…' : 'Connect Gmail'}
        </button>
      ) : (
        <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
          {messages.length === 0 && <li className="text-sm text-dim">Inbox zero.</li>}
          {messages.map((message) => (
            <li key={message.id}>
              <a
                href={gmailMessageUrl(message.id)}
                target="_blank"
                rel="noreferrer"
                className="block truncate text-sm text-ink hover:text-accent-bright"
                title={message.subject}
              >
                {message.subject}
              </a>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </Card>
  )
}
