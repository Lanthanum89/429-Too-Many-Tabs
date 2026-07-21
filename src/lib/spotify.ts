// Authorization Code + PKCE — no client secret required, so this stays safe
// to build into a static bundle (see README's note on API keys/secrets).

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID
const SCOPE = 'user-read-currently-playing'
const AUTH_ENDPOINT = 'https://accounts.spotify.com/authorize'
const TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token'

const VERIFIER_KEY = 'life-dashboard:spotify-verifier'
const TOKEN_KEY = 'life-dashboard:spotify-tokens'

interface StoredTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

// Vite's BASE_URL already matches vite.config.ts's `base`, so this resolves
// correctly in both local dev and the deployed GitHub Pages project path.
function redirectUri(): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}`
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function generateCodeVerifier(): string {
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(64)))
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return base64UrlEncode(new Uint8Array(digest))
}

function loadTokens(): StoredTokens | null {
  const raw = window.localStorage.getItem(TOKEN_KEY)
  return raw ? (JSON.parse(raw) as StoredTokens) : null
}

function saveTokens(tokens: StoredTokens) {
  window.localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens))
}

export function isConnected(): boolean {
  return loadTokens() !== null
}

export async function connectSpotify(): Promise<void> {
  const verifier = generateCodeVerifier()
  window.sessionStorage.setItem(VERIFIER_KEY, verifier)
  const challenge = await generateCodeChallenge(verifier)

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: redirectUri(),
    scope: SCOPE,
    code_challenge_method: 'S256',
    code_challenge: challenge,
  })

  window.location.assign(`${AUTH_ENDPOINT}?${params}`)
}

// Call once on app load. No-ops unless the URL carries a Spotify auth `code`
// (i.e. we just got redirected back), in which case it exchanges the code
// for tokens and strips it from the URL.
export async function handleRedirect(): Promise<void> {
  const url = new URL(window.location.href)
  const code = url.searchParams.get('code')
  if (!code) return

  const verifier = window.sessionStorage.getItem(VERIFIER_KEY)
  window.sessionStorage.removeItem(VERIFIER_KEY)
  url.searchParams.delete('code')
  url.searchParams.delete('state')
  window.history.replaceState({}, '', url.toString())
  if (!verifier) return

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri(),
    client_id: CLIENT_ID,
    code_verifier: verifier,
  })

  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) throw new Error(`Spotify token exchange failed: ${res.status}`)

  const data = (await res.json()) as { access_token: string; refresh_token: string; expires_in: number }
  saveTokens({
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  })
}

async function refreshAccessToken(refreshToken: string): Promise<StoredTokens> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: CLIENT_ID,
  })

  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) throw new Error(`Spotify token refresh failed: ${res.status}`)

  const data = (await res.json()) as {
    access_token: string
    refresh_token?: string
    expires_in: number
  }
  const tokens: StoredTokens = {
    accessToken: data.access_token,
    // Spotify doesn't always rotate the refresh token — keep the old one if so.
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000,
  }
  saveTokens(tokens)
  return tokens
}

async function getAccessToken(): Promise<string | null> {
  const tokens = loadTokens()
  if (!tokens) return null
  if (tokens.expiresAt - 60_000 > Date.now()) return tokens.accessToken
  return (await refreshAccessToken(tokens.refreshToken)).accessToken
}

export interface NowPlaying {
  isPlaying: boolean
  trackName: string | null
  artistName: string | null
  albumArtUrl: string | null
}

interface CurrentlyPlayingResponse {
  is_playing: boolean
  item: {
    name: string
    artists: { name: string }[]
    album: { images: { url: string }[] }
  } | null
}

export async function fetchCurrentlyPlaying(): Promise<NowPlaying | null> {
  const token = await getAccessToken()
  if (!token) return null

  const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
    headers: { Authorization: `Bearer ${token}` },
  })

  // 204 means nothing's playing right now — not an error.
  if (res.status === 204) {
    return { isPlaying: false, trackName: null, artistName: null, albumArtUrl: null }
  }
  if (!res.ok) throw new Error(`Spotify API error: ${res.status}`)

  const data = (await res.json()) as CurrentlyPlayingResponse
  return {
    isPlaying: data.is_playing,
    trackName: data.item?.name ?? null,
    artistName: data.item?.artists.map((artist) => artist.name).join(', ') ?? null,
    albumArtUrl: data.item?.album.images[0]?.url ?? null,
  }
}
