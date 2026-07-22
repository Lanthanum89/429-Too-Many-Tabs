import {
  isTokenValid,
  loadCachedToken,
  requestGoogleToken,
  saveCachedToken,
  type GoogleToken,
} from './googleAuth'

const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly'
const STORAGE_KEY = 'life-dashboard:google-gmail-token'

export interface InboxMessage {
  id: string
  subject: string
  from: string
  unread: boolean
  starred: boolean
  internalDate: number
}

export interface InboxPage {
  messages: InboxMessage[]
  nextPageToken?: string
}

interface MessageListResponse {
  messages?: { id: string }[]
  nextPageToken?: string
}

interface MessageHeader {
  name: string
  value: string
}

interface MessageMetadataResponse {
  labelIds?: string[]
  internalDate?: string
  payload?: { headers?: MessageHeader[] }
}

interface MessagePart {
  mimeType?: string
  body?: { data?: string }
  parts?: MessagePart[]
}

interface MessageFullResponse {
  payload?: MessagePart & { headers?: MessageHeader[] }
}

export interface EmailBody {
  id: string
  subject: string
  from: string
  date: string
  bodyText: string
}

let cachedToken: GoogleToken | null = loadCachedToken(STORAGE_KEY)

async function getToken(): Promise<string> {
  if (isTokenValid(cachedToken)) return cachedToken.accessToken
  cachedToken = await requestGoogleToken(GMAIL_SCOPE)
  saveCachedToken(STORAGE_KEY, cachedToken)
  return cachedToken.accessToken
}

export function hasValidGmailToken(): boolean {
  return isTokenValid(cachedToken)
}

async function gmailFetch<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    throw new Error(`Gmail API error: ${res.status}`)
  }
  return res.json() as Promise<T>
}

// Starred messages surface first regardless of age, then everything else
// falls back to newest-first — matches how the widget's list is scanned.
export function sortInboxMessages(messages: InboxMessage[]): InboxMessage[] {
  return [...messages].sort((a, b) => {
    if (a.starred !== b.starred) return a.starred ? -1 : 1
    return b.internalDate - a.internalDate
  })
}

const PAGE_SIZE = 20

// Fetches one page of inbox messages — read and unread alike, with star
// status. Does one metadata request per message (fine at a page of ~20)
// — switch to the `batch` endpoint if this grows a lot. Pass the previous
// page's `nextPageToken` to load more.
export async function fetchInboxMessages(pageToken?: string): Promise<InboxPage> {
  const token = await getToken()
  const query = new URLSearchParams({ q: 'in:inbox', maxResults: String(PAGE_SIZE) })
  if (pageToken) query.set('pageToken', pageToken)
  const list = await gmailFetch<MessageListResponse>(`/messages?${query}`, token)
  const ids = (list.messages ?? []).map((m) => m.id)

  const messages = await Promise.all(
    ids.map(async (id) => {
      const params = new URLSearchParams({
        format: 'metadata',
      })
      params.append('metadataHeaders', 'Subject')
      params.append('metadataHeaders', 'From')
      const msg = await gmailFetch<MessageMetadataResponse>(
        `/messages/${id}?${params}`,
        token,
      )
      const headers = msg.payload?.headers ?? []
      const subject = headers.find((h) => h.name === 'Subject')?.value ?? '(no subject)'
      const from = headers.find((h) => h.name === 'From')?.value ?? ''
      const labelIds = msg.labelIds ?? []
      return {
        id,
        subject,
        from,
        unread: labelIds.includes('UNREAD'),
        starred: labelIds.includes('STARRED'),
        internalDate: Number(msg.internalDate ?? 0),
      }
    }),
  )

  return { messages: sortInboxMessages(messages), nextPageToken: list.nextPageToken }
}

// Pulls just the display name out of a `"Name" <email@example.com>` header,
// falling back to the raw header if it isn't in that shape.
export function fromDisplayName(from: string): string {
  const match = from.match(/^"?([^"<]+?)"?\s*<[^>]+>$/)
  return match ? match[1].trim() : from
}

function base64UrlDecode(data: string): string {
  const normalized = data.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(normalized)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder('utf-8').decode(bytes)
}

// Depth-first search for the first part matching `mimeType` — messages are
// often multipart (e.g. text/plain + text/html alternatives, or with
// attachments nested further down).
function findPart(part: MessagePart, mimeType: string): MessagePart | null {
  if (part.mimeType === mimeType && part.body?.data) return part
  for (const child of part.parts ?? []) {
    const found = findPart(child, mimeType)
    if (found) return found
  }
  return null
}

// Renders HTML to plain text via the browser's own parser rather than
// displaying raw HTML from an external sender — avoids needing a sanitizer
// just to show a read-only message preview safely.
function htmlToPlainText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return doc.body.textContent?.trim() ?? ''
}

// Fetches a message's full body for the in-app reading view. Prefers the
// text/plain part; falls back to stripping tags from text/html if that's all
// the message has.
export async function fetchMessageBody(id: string): Promise<EmailBody> {
  const token = await getToken()
  const msg = await gmailFetch<MessageFullResponse>(`/messages/${id}?format=full`, token)
  const headers = msg.payload?.headers ?? []
  const subject = headers.find((h) => h.name === 'Subject')?.value ?? '(no subject)'
  const from = headers.find((h) => h.name === 'From')?.value ?? ''
  const date = headers.find((h) => h.name === 'Date')?.value ?? ''

  let bodyText = ''
  if (msg.payload) {
    const plainPart = findPart(msg.payload, 'text/plain')
    if (plainPart?.body?.data) {
      bodyText = base64UrlDecode(plainPart.body.data)
    } else {
      const htmlPart = findPart(msg.payload, 'text/html')
      if (htmlPart?.body?.data) {
        bodyText = htmlToPlainText(base64UrlDecode(htmlPart.body.data))
      }
    }
  }

  return { id, subject, from, date, bodyText: bodyText.trim() || '(no body content)' }
}
