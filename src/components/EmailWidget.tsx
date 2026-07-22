import { useEffect, useState } from 'react'
import { Card } from './Card'
import { fetchUnreadMessages, hasValidGmailToken, type UnreadMessage } from '../lib/gmail'

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
    <Card className="flex flex-col gap-3">
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
        <ul className="flex flex-col gap-2 overflow-y-auto">
          {messages.length === 0 && <li className="text-sm text-dim">Inbox zero.</li>}
          {messages.map((message) => (
            <li key={message.id} className="truncate text-sm text-ink">
              {message.subject}
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </Card>
  )
}
