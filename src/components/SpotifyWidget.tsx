import { useEffect, useRef, useState } from 'react'
import { Card } from './Card'
import {
  connectSpotify,
  fetchCurrentlyPlaying,
  isConnected,
  pausePlayback,
  PlaybackControlError,
  resumePlayback,
  skipToNext,
  skipToPrevious,
  type NowPlaying,
} from '../lib/spotify'

const POLL_INTERVAL_MS = 15_000
const TICK_INTERVAL_MS = 500
// Give Spotify a moment to actually apply the change before re-polling —
// polling immediately often still returns the pre-skip track.
const POST_CONTROL_REFRESH_DELAY_MS = 400

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
  const [controlError, setControlError] = useState<string | null>(null)
  const [controlPending, setControlPending] = useState(false)
  const [displayedProgressMs, setDisplayedProgressMs] = useState(0)
  const lastSyncRef = useRef(Date.now())

  async function poll() {
    try {
      const data = await fetchCurrentlyPlaying()
      setNowPlaying(data)
      setDisplayedProgressMs(data?.progressMs ?? 0)
      lastSyncRef.current = Date.now()
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Spotify')
    }
  }

  useEffect(() => {
    if (!connected) return undefined

    let cancelled = false

    async function pollIfActive() {
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

    pollIfActive()
    const id = setInterval(pollIfActive, POLL_INTERVAL_MS)
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

  async function runControl(action: () => Promise<void>) {
    setControlPending(true)
    setControlError(null)
    try {
      await action()
      // Optimistic UI updates instantly (below); this just resyncs the exact
      // state once Spotify has actually applied the change.
      await new Promise((resolve) => setTimeout(resolve, POST_CONTROL_REFRESH_DELAY_MS))
      await poll()
    } catch (err) {
      if (err instanceof PlaybackControlError) {
        setControlError(err.message)
      } else {
        setControlError(err instanceof Error ? err.message : 'Playback control failed')
      }
    } finally {
      setControlPending(false)
    }
  }

  function handlePrevious() {
    void runControl(skipToPrevious)
  }

  function handleNext() {
    void runControl(skipToNext)
  }

  function handlePlayPause() {
    const isPlaying = nowPlaying?.isPlaying ?? false
    // Optimistic flip so the button feels instant instead of waiting on the network.
    setNowPlaying((prev) => (prev ? { ...prev, isPlaying: !isPlaying } : prev))
    void runControl(isPlaying ? pausePlayback : resumePlayback)
  }

  if (!connected) {
    return (
      <Card className="flex flex-col items-center justify-center gap-3 text-center">
        <h2 className="font-mono text-lg font-bold text-accent-neon">Spotify</h2>
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
      {!nowPlaying?.trackName && (
        <h2 className="font-mono text-sm tracking-wide text-muted uppercase">Spotify</h2>
      )}
      {nowPlaying?.trackName ? (
        <>
          {nowPlaying.albumArtUrl && (
            <img
              src={nowPlaying.albumArtUrl}
              alt=""
              className="h-14 w-14 shrink-0 rounded-lg object-cover shadow-lg"
            />
          )}
          {nowPlaying.trackUrl ? (
            <a
              href={nowPlaying.trackUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 max-w-full shrink-0 truncate text-sm font-medium text-ink hover:text-accent-neon"
            >
              {nowPlaying.trackName}
            </a>
          ) : (
            <p className="mt-1 max-w-full shrink-0 truncate text-sm font-medium text-ink">{nowPlaying.trackName}</p>
          )}
          <p className="max-w-full shrink-0 truncate text-xs text-muted">{nowPlaying.artistName}</p>
          {nowPlaying.contextName && (
            <p className="max-w-full shrink-0 truncate text-[11px] text-dim">Playing from: {nowPlaying.contextName}</p>
          )}
          <div className="mt-1 w-full max-w-[180px] shrink-0">
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
          <div className="mt-1 flex shrink-0 items-center gap-4">
            <button
              onClick={handlePrevious}
              disabled={controlPending}
              aria-label="Previous track"
              className="text-muted hover:text-accent-neon disabled:opacity-40"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
              </svg>
            </button>
            <button
              onClick={handlePlayPause}
              disabled={controlPending}
              aria-label={nowPlaying.isPlaying ? 'Pause' : 'Play'}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-void hover:bg-accent-neon disabled:opacity-40"
            >
              {nowPlaying.isPlaying ? (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M6 5h4v14H6zm8 0h4v14h-4z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            <button
              onClick={handleNext}
              disabled={controlPending}
              aria-label="Next track"
              className="text-muted hover:text-accent-neon disabled:opacity-40"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M16 6h2v12h-2zM6 6l8.5 6L6 18z" />
              </svg>
            </button>
          </div>
          {controlError && <p className="mt-1 text-[11px] text-danger">{controlError}</p>}
        </>
      ) : (
        <p className="text-sm text-dim">Nothing playing.</p>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </Card>
  )
}
