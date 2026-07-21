import { useState } from 'react'
import { Card } from './Card'
import type { WidgetSize } from '../theme/modes'
import { fetchUnreadMessages, type UnreadMessage } from '../lib/gmail'

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

  return (
    <Card className="flex flex-col gap-2">
      <h2 className="text-sm font-medium text-gray-400">Email</h2>
      {messages === null ? (
        <button
          onClick={connect}
          disabled={loading}
          className="self-start rounded-lg bg-gray-700 px-3 py-1 text-sm hover:bg-gray-600 disabled:opacity-50"
        >
          {loading ? 'Connecting…' : 'Connect Gmail'}
        </button>
      ) : (
        <ul className="flex flex-col gap-1 overflow-y-auto">
          {messages.length === 0 && <li className="text-sm text-gray-500">Inbox zero.</li>}
          {messages.map((message) => (
            <li key={message.id} className="truncate text-sm">
              {message.subject}
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </Card>
  )
}
