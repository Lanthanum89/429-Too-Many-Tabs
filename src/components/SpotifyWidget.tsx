import { useEffect, useRef, useState } from 'react'
import { Card } from './Card'
import { connectSpotify, fetchCurrentlyPlaying, isConnected, type NowPlaying } from '../lib/spotify'

const POLL_INTERVAL_MS = 15_000
const TICK_INTERVAL_MS = 500

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function SpotifyWidget() {
  // Only ever changes via a full page reload (the OAuth redirect round-trip),
  // so a plain read is enough — no state needed to react to it mid-session.
  const connected = isConnected()
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [displayedProgressMs, setDisplayedProgressMs] = useState(0)
  const lastSyncRef = useRef(Date.now())

  useEffect(() => {
    if (!connected) return undefined

    let cancelled = false

    async function poll() {
      try {
        const data = await fetchCurrentlyPlaying()
        if (cancelled) return
        setNowPlaying(data)
        setDisplayedProgressMs(data?.progressMs ?? 0)
        lastSyncRef.current = Date.now()
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

  // Ticks the displayed progress between polls so the bar moves smoothly
  // instead of jumping once every POLL_INTERVAL_MS; each new poll resyncs
  // the exact value via the effect above.
  useEffect(() => {
    if (!nowPlaying?.isPlaying) return undefined

    const id = setInterval(() => {
      const elapsedSincePoll = Date.now() - lastSyncRef.current
      setDisplayedProgressMs(Math.min(nowPlaying.progressMs + elapsedSincePoll, nowPlaying.durationMs))
    }, TICK_INTERVAL_MS)

    return () => clearInterval(id)
  }, [nowPlaying])

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

  const progressPercent = nowPlaying?.durationMs
    ? Math.min(100, (displayedProgressMs / nowPlaying.durationMs) * 100)
    : 0

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
          {nowPlaying.trackUrl ? (
            <a
              href={nowPlaying.trackUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 max-w-full truncate text-sm font-medium text-ink hover:text-accent-bright"
            >
              {nowPlaying.trackName}
            </a>
          ) : (
            <p className="mt-1 max-w-full truncate text-sm font-medium text-ink">{nowPlaying.trackName}</p>
          )}
          <p className="max-w-full truncate text-xs text-muted">{nowPlaying.artistName}</p>
          {nowPlaying.contextName && (
            <p className="max-w-full truncate text-[11px] text-dim">Playing from: {nowPlaying.contextName}</p>
          )}
          <div className="mt-2 w-full max-w-[180px]">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-500 ease-linear"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-dim">
              <span>{formatDuration(displayedProgressMs)}</span>
              <span>{formatDuration(nowPlaying.durationMs)}</span>
            </div>
          </div>
        </>
      ) : (
        <p className="text-sm text-dim">Nothing playing.</p>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </Card>
  )
}
