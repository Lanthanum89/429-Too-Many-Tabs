import { useEffect, useState } from 'react'
import { Card } from './Card'
import {
  fetchInboxMessages,
  fetchMessageBody,
  hasValidGmailToken,
  type EmailBody,
  type InboxMessage,
} from '../lib/gmail'

function gmailMessageUrl(id: string): string {
  return `https://mail.google.com/mail/u/0/#inbox/${id}`
}

export function EmailWidget() {
  const [messages, setMessages] = useState<InboxMessage[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [openMessage, setOpenMessage] = useState<EmailBody | null>(null)
  const [openLoading, setOpenLoading] = useState(false)
  const [openError, setOpenError] = useState<string | null>(null)

  async function connect() {
    setLoading(true)
    setError(null)
    try {
      setMessages(await fetchInboxMessages(20))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load email')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (hasValidGmailToken()) connect()
  }, [])

  async function openInApp(id: string) {
    setOpenLoading(true)
    setOpenError(null)
    try {
      setOpenMessage(await fetchMessageBody(id))
    } catch (err) {
      setOpenError(err instanceof Error ? err.message : 'Failed to load message')
    } finally {
      setOpenLoading(false)
    }
  }

  function closeMessage() {
    setOpenMessage(null)
    setOpenError(null)
  }

  return (
    <Card className="flex min-h-0 flex-1 flex-col gap-3">
      {openMessage || openLoading || openError ? (
        <>
          <div className="flex items-center gap-2">
            <button
              onClick={closeMessage}
              aria-label="Back to inbox"
              className="text-muted hover:text-accent-bright"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <h2 className="font-display text-sm tracking-wide text-muted uppercase">Email</h2>
          </div>
          {openLoading && <p className="text-sm text-dim">Loading…</p>}
          {openError && <p className="text-xs text-danger">{openError}</p>}
          {openMessage && (
            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
              <p className="text-sm font-medium text-ink">{openMessage.subject}</p>
              <p className="text-xs text-muted">{openMessage.from}</p>
              {openMessage.date && <p className="text-[11px] text-dim">{openMessage.date}</p>}
              <p className="mt-1 whitespace-pre-wrap text-sm text-ink">{openMessage.bodyText}</p>
              <a
                href={gmailMessageUrl(openMessage.id)}
                target="_blank"
                rel="noreferrer"
                className="mt-2 self-start text-xs text-accent hover:text-accent-bright"
              >
                Open in Gmail ↗
              </a>
            </div>
          )}
        </>
      ) : (
        <>
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
            <ul className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
              {messages.length === 0 && <li className="text-sm text-dim">Inbox empty.</li>}
              {messages.map((message) => (
                <li key={message.id}>
                  <button
                    onClick={() => openInApp(message.id)}
                    className="flex w-full items-center gap-1.5 text-left text-sm hover:text-accent-bright"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="12"
                      height="12"
                      className={`shrink-0 ${message.starred ? 'fill-accent-bright' : 'fill-none stroke-dim'}`}
                      strokeWidth="1.5"
                    >
                      <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.8-6.2 3.8 1.6-7L2 9.2l7.1-.6z" />
                    </svg>
                    <span
                      className={`truncate ${message.unread ? 'font-semibold text-ink' : 'text-muted'}`}
                      title={message.subject}
                    >
                      {message.subject}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {error && <p className="text-xs text-danger">{error}</p>}
        </>
      )}
    </Card>
  )
}
