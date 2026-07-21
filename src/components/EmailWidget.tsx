import { useEffect, useState } from 'react'
import { Card } from './Card'
import type { WidgetSize } from '../theme/modes'
import { fetchUnreadMessages, hasValidGmailToken, type UnreadMessage } from '../lib/gmail'

export function EmailWidget({ size }: { size: Exclude<WidgetSize, 'hidden'> }) {
  const [messages, setMessages] = useState<UnreadMessage[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function connect() {
    setLoading(true)
    setError(null)
    try {
      const maxResults = size === 'lg' ? 10 : size === 'md' ? 6 : 3
      setMessages(await fetchUnreadMessages(maxResults))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load email')
    } finally {
      setLoading(false)
    }
  }

  // See CalendarWidget for why this restores silently on mount.
  useEffect(() => {
    if (hasValidGmailToken()) connect()
  }, [])

  return (
    <Card className="flex flex-col gap-2">
      <h2 className="font-display text-sm font-medium tracking-wide text-tan uppercase">Email</h2>
      {messages === null ? (
        <button
          onClick={connect}
          disabled={loading}
          className="self-start rounded-lg bg-olive px-3 py-1 text-sm text-cream hover:bg-mustard hover:text-walnut disabled:opacity-50"
        >
          {loading ? 'Connecting…' : 'Connect Gmail'}
        </button>
      ) : (
        <ul className="flex flex-col gap-1 overflow-y-auto">
          {messages.length === 0 && <li className="text-sm text-dim">Inbox zero.</li>}
          {messages.map((message) => (
            <li key={message.id} className="truncate text-sm text-cream">
              {message.subject}
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-xs text-terracotta">{error}</p>}
    </Card>
  )
}
