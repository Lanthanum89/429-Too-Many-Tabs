import { useEffect, useState } from 'react'
import { Card } from './Card'
import { connectSpotify, fetchCurrentlyPlaying, isConnected, type NowPlaying } from '../lib/spotify'

const POLL_INTERVAL_MS = 15_000

export function SpotifyWidget() {
  // Only ever changes via a full page reload (the OAuth redirect round-trip),
  // so a plain read is enough — no state needed to react to it mid-session.
  const connected = isConnected()
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!connected) return undefined

    let cancelled = false

    async function poll() {
      try {
        const data = await fetchCurrentlyPlaying()
        if (cancelled) return
        setNowPlaying(data)
        setError(null)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load Spotify')
      }
    }

    poll()
    const id = setInterval(poll, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [connected])

  async function connect() {
    try {
      await connectSpotify()
    } catch {
      setError('Failed to start Spotify connect')
    }
  }

  if (!connected) {
    return (
      <Card className="flex flex-col items-center justify-center gap-3 text-center">
        <h2 className="font-display text-sm tracking-wide text-muted uppercase">Spotify</h2>
        <button
          onClick={connect}
          className="rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-void hover:bg-accent-bright"
        >
          Connect Spotify
        </button>
        {error && <p className="text-xs text-danger">{error}</p>}
      </Card>
    )
  }

  return (
    <Card className="flex flex-col items-center justify-center gap-1 text-center">
      <h2 className="font-display text-sm tracking-wide text-muted uppercase">Spotify</h2>
      {nowPlaying?.isPlaying ? (
        <>
          {nowPlaying.albumArtUrl && (
            <img
              src={nowPlaying.albumArtUrl}
              alt=""
              className="mt-1 h-28 w-28 rounded-lg object-cover"
            />
          )}
          <p className="mt-1 text-sm font-medium text-ink">{nowPlaying.trackName}</p>
          <p className="text-xs text-muted">{nowPlaying.artistName}</p>
        </>
      ) : (
        <p className="text-sm text-dim">Nothing playing.</p>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </Card>
  )
}
