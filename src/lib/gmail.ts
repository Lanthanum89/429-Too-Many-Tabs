import { requestGoogleToken, type GoogleToken } from './googleAuth'

const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly'

export interface UnreadMessage {
  id: string
  subject: string
  from: string
}

interface MessageListResponse {
  messages?: { id: string }[]
}

interface MessageHeader {
  name: string
  value: string
}

interface MessageMetadataResponse {
  payload?: { headers?: MessageHeader[] }
}

let cachedToken: GoogleToken | null = null

async function getToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt - 60_000 > Date.now()) {
    return cachedToken.accessToken
  }
  cachedToken = await requestGoogleToken(GMAIL_SCOPE)
  return cachedToken.accessToken
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

// Fetches unread subjects. Does one metadata request per message (fine at
// 5-10 unread) — switch to the `batch` endpoint if this list grows.
export async function fetchUnreadMessages(maxResults = 8): Promise<UnreadMessage[]> {
  const token = await getToken()
  const query = new URLSearchParams({ q: 'is:unread in:inbox', maxResults: String(maxResults) })
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
      return { id, subject, from }
    }),
  )
}
