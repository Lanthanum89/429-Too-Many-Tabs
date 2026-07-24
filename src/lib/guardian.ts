const API_KEY = import.meta.env.VITE_GUARDIAN_API_KEY

export interface GuardianHeadline {
  id: string
  webTitle: string
  webUrl: string
  sectionName: string
  webPublicationDate: string
}

interface GuardianSearchResponse {
  response?: {
    status?: string
    results?: {
      id: string
      webTitle: string
      webUrl: string
      sectionName: string
      webPublicationDate: string
    }[]
  }
}

export function hasGuardianKey(): boolean {
  return Boolean(API_KEY)
}

// The Guardian Open Platform's content search, with no query terms — just
// the newest published articles, functioning as a plain headlines feed.
export async function fetchTopHeadlines(pageSize = 6): Promise<GuardianHeadline[]> {
  if (!API_KEY) throw new Error('Guardian API key not configured')

  const params = new URLSearchParams({
    'order-by': 'newest',
    'page-size': String(pageSize),
    'api-key': API_KEY,
  })
  const res = await fetch(`https://content.guardianapis.com/search?${params}`)
  if (!res.ok) throw new Error(`Guardian API error: ${res.status}`)

  const data = (await res.json()) as GuardianSearchResponse
  return (data.response?.results ?? []).map((item) => ({
    id: item.id,
    webTitle: item.webTitle,
    webUrl: item.webUrl,
    sectionName: item.sectionName,
    webPublicationDate: item.webPublicationDate,
  }))
}
