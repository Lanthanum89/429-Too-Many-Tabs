// Authorization Code + PKCE — no client secret required, so this stays safe
// to build into a static bundle (see README's note on API keys/secrets).

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID
// user-read-playback-state is what unlocks /v1/me/player's shuffle_state (and
// device/context info) - user-read-currently-playing is kept alongside it
// since it's the narrower scope the old currently-playing-only requests used,
// and dropping it buys nothing now that the broader scope covers it too.
const SCOPE =
  'user-read-playback-state user-read-currently-playing playlist-read-private user-modify-playback-state'
const AUTH_ENDPOINT = 'https://accounts.spotify.com/authorize'
const TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token'
const REQUIRED_PLAYBACK_SCOPE = 'user-read-playback-state'

const VERIFIER_KEY = 'life-dashboard:spotify-verifier'
const TOKEN_KEY = 'life-dashboard:spotify-tokens'

interface StoredTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number
  // Space-separated, straight from Spotify's token response. Absent on
  // tokens stored before this field existed - treated as "doesn't have the
  // new scope" (see hasPlaybackStateScope), never as "unknown, assume fine".
  grantedScopes?: string
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

// Client-side check so a token minted before this scope existed fails fast
// with a clear "reconnect" prompt instead of a doomed API call - see
// SpotifyScopeError below for the same check applied server-side too, in
// case a token's scope metadata is missing or stale for some other reason.
export function hasPlaybackStateScope(): boolean {
  const tokens = loadTokens()
  if (!tokens?.grantedScopes) return false
  return tokens.grantedScopes.split(' ').includes(REQUIRED_PLAYBACK_SCOPE)
}

// Clears the stored connection so a fresh connectSpotify() call requests a
// clean set of tokens under the current SCOPE, rather than the OAuth flow
// silently reusing an old refresh token that can never carry a new scope.
export function disconnectSpotify(): void {
  window.localStorage.removeItem(TOKEN_KEY)
  window.sessionStorage.removeItem(VERIFIER_KEY)
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

  const data = (await res.json()) as {
    access_token: string
    refresh_token: string
    expires_in: number
    scope?: string
  }
  saveTokens({
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    grantedScopes: data.scope,
  })
}

async function refreshAccessToken(refreshToken: string, previousScopes: string | undefined): Promise<StoredTokens> {
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
    scope?: string
  }
  const tokens: StoredTokens = {
    accessToken: data.access_token,
    // Spotify doesn't always rotate the refresh token — keep the old one if so.
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000,
    // Refresh normally carries the original grant's scope forward unchanged;
    // Spotify doesn't always echo it back on this endpoint, so fall back to
    // what was already stored rather than losing it.
    grantedScopes: data.scope ?? previousScopes,
  }
  saveTokens(tokens)
  return tokens
}

async function getAccessToken(): Promise<string | null> {
  const tokens = loadTokens()
  if (!tokens) return null
  if (tokens.expiresAt - 60_000 > Date.now()) return tokens.accessToken
  return (await refreshAccessToken(tokens.refreshToken, tokens.grantedScopes)).accessToken
}

export interface NowPlaying {
  isPlaying: boolean
  trackName: string | null
  artistName: string | null
  albumArtUrl: string | null
  trackUrl: string | null
  progressMs: number
  durationMs: number
  contextName: string | null
  shuffleState: boolean
}

// Thrown when the connected token was granted before user-read-playback-state
// existed (or Spotify otherwise refuses the request as scope-insufficient).
// Distinct from a generic Error so callers can show a reconnect prompt
// instead of a plain "failed to load" message.
export class SpotifyScopeError extends Error {
  constructor() {
    super('Reconnect Spotify to enable accurate playback and shuffle state.')
  }
}

const EMPTY_PLAYBACK_STATE: NowPlaying = {
  isPlaying: false,
  trackName: null,
  artistName: null,
  albumArtUrl: null,
  trackUrl: null,
  progressMs: 0,
  durationMs: 0,
  contextName: null,
  shuffleState: false,
}

// item.type discriminates track vs podcast episode -- an episode has no
// `artists`/`album` at all, so treating every item as a track crashed
// (`.artists.map` on undefined) the first time a podcast was playing.
interface TrackItem {
  type: 'track'
  name: string
  duration_ms: number
  artists: { name: string }[]
  album: { images: { url: string }[] }
  external_urls: { spotify: string }
}

interface EpisodeItem {
  type: 'episode'
  name: string
  duration_ms: number
  images: { url: string }[]
  external_urls: { spotify: string }
  show: { name: string }
}

interface PlayerStateResponse {
  is_playing: boolean
  progress_ms: number | null
  shuffle_state: boolean
  item: TrackItem | EpisodeItem | null
  context: { uri: string; href: string } | null
}

// Cached across polls so an unchanged context (still on the same playlist)
// doesn't refetch its name every 15s — only refetched when the URI changes.
let cachedContextUri: string | null = null
let cachedContextName: string | null = null

async function resolveContextName(
  token: string,
  context: PlayerStateResponse['context'],
): Promise<string | null> {
  if (!context) {
    cachedContextUri = null
    cachedContextName = null
    return null
  }
  if (context.uri === cachedContextUri) return cachedContextName

  try {
    const res = await fetch(context.href, { headers: { Authorization: `Bearer ${token}` } })
    // Missing playlist-read-private scope on an older session, a since-deleted
    // playlist, etc. — degrade to no context name rather than failing the widget.
    if (!res.ok) return null
    const data = (await res.json()) as { name?: string }
    cachedContextUri = context.uri
    cachedContextName = data.name ?? null
    return cachedContextName
  } catch {
    return null
  }
}

export async function fetchCurrentlyPlaying(): Promise<NowPlaying | null> {
  const token = await getAccessToken()
  if (!token) return null

  // Fail fast, client-side, rather than let a token minted under the old
  // scope hit the network for a request it can never succeed at — this is
  // what catches every pre-migration cached token (grantedScopes is simply
  // absent on those) and prompts reconnect immediately.
  if (!hasPlaybackStateScope()) throw new SpotifyScopeError()

  const res = await fetch('https://api.spotify.com/v1/me/player', {
    headers: { Authorization: `Bearer ${token}` },
  })

  // 204 means no active playback session at all right now — not an error.
  if (res.status === 204) return EMPTY_PLAYBACK_STATE

  // Defense in depth: the scope metadata said this token should work, but
  // Spotify disagrees (e.g. the grant was revoked externally). Same
  // reconnect path either way.
  if (res.status === 403) throw new SpotifyScopeError()
  if (!res.ok) throw new Error(`Spotify API error: ${res.status}`)

  const data = (await res.json()) as PlayerStateResponse
  const contextName = await resolveContextName(token, data.context)
  const item = data.item

  return {
    isPlaying: data.is_playing,
    trackName: item?.name ?? null,
    artistName: item ? (item.type === 'episode' ? item.show.name : item.artists.map((a) => a.name).join(', ')) : null,
    albumArtUrl: item ? (item.type === 'episode' ? (item.images[0]?.url ?? null) : (item.album.images[0]?.url ?? null)) : null,
    trackUrl: item?.external_urls.spotify ?? null,
    progressMs: data.progress_ms ?? 0,
    durationMs: item?.duration_ms ?? 0,
    contextName,
    shuffleState: data.shuffle_state,
  }
}

// Playback control (Web API's /me/player/* transfer endpoints) requires
// Spotify Premium on the connected account — free-tier accounts get a 403
// from these specific endpoints even though reading currently-playing above
// works on any tier.
export class PlaybackControlError extends Error {
  reason: 'no_active_device' | 'forbidden' | 'unknown'

  constructor(reason: PlaybackControlError['reason'], message: string) {
    super(message)
    this.reason = reason
  }
}

async function playbackControlRequest(method: 'POST' | 'PUT', path: string): Promise<void> {
  const token = await getAccessToken()
  if (!token) throw new PlaybackControlError('unknown', 'Not connected to Spotify')

  const res = await fetch(`https://api.spotify.com/v1/me/player${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}` },
  })

  if (res.ok) return

  if (res.status === 404) {
    throw new PlaybackControlError(
      'no_active_device',
      'No active Spotify device — open Spotify and start playing somewhere first.',
    )
  }
  if (res.status === 403) {
    throw new PlaybackControlError(
      'forbidden',
      'Spotify refused this — playback control requires a Premium account.',
    )
  }
  throw new PlaybackControlError('unknown', `Spotify API error: ${res.status}`)
}

export function skipToNext(): Promise<void> {
  return playbackControlRequest('POST', '/next')
}

export function skipToPrevious(): Promise<void> {
  return playbackControlRequest('POST', '/previous')
}

export function pausePlayback(): Promise<void> {
  return playbackControlRequest('PUT', '/pause')
}

export function resumePlayback(): Promise<void> {
  return playbackControlRequest('PUT', '/play')
}

export function setShuffle(state: boolean): Promise<void> {
  return playbackControlRequest('PUT', `/shuffle?state=${state}`)
}
