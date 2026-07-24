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

export function sortInboxMessages(messages: InboxMessage[]): InboxMessage[] {
  return [...messages].sort((a, b) => b.internalDate - a.internalDate)
}

const PAGE_SIZE = 20
// Starred messages are meant to always ALL be visible regardless of where
// they fall in the regular inbox pagination — a generous cap rather than
// true unbounded pagination, since a personal inbox realistically never
// has more starred messages than this in practice.
const ALL_STARRED_CAP = 200

async function fetchMessagesForQuery(
  query: string,
  maxResults: number,
  pageToken?: string,
): Promise<InboxPage> {
  const token = await getToken()
  const params = new URLSearchParams({ q: query, maxResults: String(maxResults) })
  if (pageToken) params.set('pageToken', pageToken)
  const list = await gmailFetch<MessageListResponse>(`/messages?${params}`, token)
  const ids = (list.messages ?? []).map((m) => m.id)

  const messages = await Promise.all(
    ids.map(async (id) => {
      const metaParams = new URLSearchParams({ format: 'metadata' })
      metaParams.append('metadataHeaders', 'Subject')
      metaParams.append('metadataHeaders', 'From')
      const msg = await gmailFetch<MessageMetadataResponse>(
        `/messages/${id}?${metaParams}`,
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

// Fetches one page of inbox messages — read and unread alike, with star
// status. Does one metadata request per message (fine at a page of ~20)
// — switch to the `batch` endpoint if this grows a lot. Pass the previous
// page's `nextPageToken` to load more.
export async function fetchInboxMessages(pageToken?: string): Promise<InboxPage> {
  return fetchMessagesForQuery('in:inbox', PAGE_SIZE, pageToken)
}

// All starred inbox messages in one shot (server-side filtered, so this
// isn't limited by wherever they'd otherwise fall in fetchInboxMessages'
// regular pagination window) — merge into the displayed list so a starred
// message is never hidden behind "Load more".
export async function fetchAllStarredMessages(): Promise<InboxMessage[]> {
  const { messages } = await fetchMessagesForQuery('in:inbox is:starred', ALL_STARRED_CAP)
  return messages
}

interface LabelResponse {
  messagesUnread?: number
}

// The inbox label's own unread counter — the true total, not just a count
// over whatever page(s) happen to be loaded client-side.
export async function fetchInboxUnreadCount(): Promise<number> {
  const token = await getToken()
  const label = await gmailFetch<LabelResponse>('/labels/INBOX', token)
  return label.messagesUnread ?? 0
}

// Pulls just the display name out of a `"Name" <email@example.com>` header,
// falling back to the raw header if it isn't in that shape.
export function fromDisplayName(from: string): string {
  const match = from.match(/^"?([^"<]+?)"?\s*<[^>]+>$/)
  return match ? match[1].trim() : from
}

