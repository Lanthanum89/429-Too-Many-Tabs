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
}

interface MessageListResponse {
  messages?: { id: string }[]
}

interface MessageHeader {
  name: string
  value: string
}

interface MessageMetadataResponse {
  labelIds?: string[]
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

// Fetches the most recent inbox messages — read and unread alike, with star
// status. Does one metadata request per message (fine at a couple dozen)
// — switch to the `batch` endpoint if this list grows a lot.
export async function fetchInboxMessages(maxResults = 20): Promise<InboxMessage[]> {
  const token = await getToken()
  const query = new URLSearchParams({ q: 'in:inbox', maxResults: String(maxResults) })
  const list = await gmailFetch<MessageListResponse>(`/messages?${query}`, token)
  const ids = (list.messages ?? []).map((m) => m.id)

  return Promise.all(
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
      }
    }),
  )
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
