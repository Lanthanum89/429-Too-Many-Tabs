// Proxies whitelisted Reading Buses Open Data (r2p.com) endpoints. The
// upstream API doesn't send CORS headers, so a browser can't call it
// directly from a static site - this Worker does the request server-side
// (where CORS doesn't apply) and adds the header itself on the way back.
// It also keeps the real API token out of the client bundle entirely.

const ALLOWED_ENDPOINTS = new Set(['siri-sm', 'busstops'])

function corsHeaders(origin, allowedOrigins) {
  const isAllowed = allowedOrigins.length === 0 || allowedOrigins.includes(origin)
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin || '*' : 'null',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') ?? ''
    const allowedOrigins = (env.ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean)
    const headers = corsHeaders(origin, allowedOrigins)

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers })
    }

    if (allowedOrigins.length > 0 && !allowedOrigins.includes(origin)) {
      return new Response('Forbidden', { status: 403, headers })
    }

    const url = new URL(request.url)
    const endpoint = url.pathname.replace(/^\/+/, '')
    if (!ALLOWED_ENDPOINTS.has(endpoint)) {
      return new Response('Not found', { status: 404, headers })
    }

    const upstream = new URL(`https://reading-opendata.r2p.com/api/v1/${endpoint}`)
    for (const [key, value] of url.searchParams) {
      if (key === 'api_token') continue // never let a caller override this
      upstream.searchParams.set(key, value)
    }
    upstream.searchParams.set('api_token', env.READING_BUSES_API_TOKEN)

    const upstreamRes = await fetch(upstream.toString())
    const body = await upstreamRes.text()

    return new Response(body, {
      status: upstreamRes.status,
      headers: {
        ...headers,
        'Content-Type': upstreamRes.headers.get('Content-Type') ?? 'text/plain',
      },
    })
  },
}
