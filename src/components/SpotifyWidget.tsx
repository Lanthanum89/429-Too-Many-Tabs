import { useEffect, useRef, useState } from 'react'
import { Card } from './Card'
import { Teddy } from './Doodles'
import {
  connectSpotify,
  fetchCurrentlyPlaying,
  isConnected,
  pausePlayback,
  PlaybackControlError,
  resumePlayback,
  setShuffle,
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

// Downsamples the album art to a tiny canvas and averages it, so the card
// can glow with whatever color the cover actually is instead of a fixed
// accent - purely decorative, so any failure (a host that doesn't send
// CORS headers taints the canvas, a network hiccup) just means no glow
// rather than a broken widget.
function sampleAverageColor(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const size = 8
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        if (!ctx) return resolve(null)
        ctx.drawImage(img, 0, 0, size, size)
        const { data } = ctx.getImageData(0, 0, size, size)
        let r = 0
        let g = 0
        let b = 0
        const pixels = data.length / 4
        for (let i = 0; i < data.length; i += 4) {
          r += data[i]
          g += data[i + 1]
          b += data[i + 2]
        }
        resolve(`${Math.round(r / pixels)}, ${Math.round(g / pixels)}, ${Math.round(b / pixels)}`)
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
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
  // Optimistic-only, not synced from Spotify: the currently-playing endpoint
  // this widget polls doesn't include shuffle_state (only the heavier
  // /me/player endpoint does, which needs a broader scope) - so this
  // reflects what was last toggled here, not necessarily the account's true
  // state if changed from another device in the meantime.
  const [shuffleOn, setShuffleOn] = useState(false)
  // "r, g, b" (no wrapper) so it drops straight into an rgba(...) template
  // at whatever alpha the box-shadow layers below need.
  const [glowColor, setGlowColor] = useState<string | null>(null)
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

  useEffect(() => {
    const url = nowPlaying?.albumArtUrl
    if (!url) {
      setGlowColor(null)
      return
    }
    let cancelled = false
    sampleAverageColor(url).then((color) => {
      if (!cancelled) setGlowColor(color)
    })
    return () => {
      cancelled = true
    }
  }, [nowPlaying?.albumArtUrl])

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

  function handleShuffle() {
    const next = !shuffleOn
    // Optimistic flip, same pattern as play/pause below.
    setShuffleOn(next)
    void runControl(() => setShuffle(next))
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
    <Card
      className="flex flex-col items-center justify-center gap-2 text-center"
      style={
        glowColor && nowPlaying?.isPlaying
          ? { boxShadow: `0 10px 32px -6px rgba(${glowColor}, 0.55), 0 3px 10px -2px rgba(${glowColor}, 0.35)` }
          : undefined
      }
    >
      {!nowPlaying?.trackName && (
        <h2 className="font-mono text-sm tracking-wide text-muted uppercase">Spotify</h2>
      )}
      {nowPlaying?.trackName ? (
        <>
          {/* Side-by-side, not stacked: the card is wide-and-short now
              (rectangular, not square), so art-on-top-of-everything-else
              no longer fits without either shrinking the art back down or
              clipping the controls - horizontal layout uses the actual
              shape it has instead of fighting it. */}
          <div className="flex w-full items-center gap-3">
            {nowPlaying.albumArtUrl && (
              <img
                src={nowPlaying.albumArtUrl}
                alt=""
                className={`h-16 w-16 shrink-0 rounded-full object-cover shadow-lg ${
                  nowPlaying.isPlaying ? 'animate-vinyl-spin' : ''
                }`}
              />
            )}
            <div className="min-w-0 flex-1 text-left">
              {nowPlaying.trackUrl ? (
                <a
                  href={nowPlaying.trackUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate text-sm font-medium text-ink hover:text-accent-neon"
                >
                  {nowPlaying.trackName}
                </a>
              ) : (
                <p className="truncate text-sm font-medium text-ink">{nowPlaying.trackName}</p>
              )}
              <p className="truncate text-xs text-muted">{nowPlaying.artistName}</p>
              {nowPlaying.contextName && (
                <p className="truncate text-[11px] text-dim">Playing from: {nowPlaying.contextName}</p>
              )}
              <div className="mt-1 w-full">
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
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <button
              onClick={handleShuffle}
              disabled={controlPending}
              aria-label={shuffleOn ? 'Disable shuffle' : 'Enable shuffle'}
              aria-pressed={shuffleOn}
              className={`flex items-center justify-center rounded-full border-2 p-1 transition-all duration-200 ease-bounce hover:scale-110 active:scale-90 disabled:opacity-40 ${
                shuffleOn
                  ? 'border-accent-bright bg-accent-bright text-void'
                  : 'border-line bg-transparent text-muted hover:border-accent-neon hover:text-accent-neon'
              }`}
            >
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 3 21 3 21 8" />
                <line x1="4" y1="20" x2="21" y2="3" />
                <polyline points="21 16 21 21 16 21" />
                <line x1="15" y1="15" x2="21" y2="21" />
                <line x1="4" y1="4" x2="9" y2="9" />
              </svg>
            </button>
            <button
              onClick={handlePrevious}
              disabled={controlPending}
              aria-label="Previous track"
              className="text-muted transition-transform duration-200 ease-bounce hover:scale-125 hover:text-accent-neon active:scale-90 disabled:opacity-40"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
              </svg>
            </button>
            <button
              onClick={handlePlayPause}
              disabled={controlPending}
              aria-label={nowPlaying.isPlaying ? 'Pause' : 'Play'}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-void transition-transform duration-200 ease-bounce hover:scale-110 hover:bg-accent-neon active:scale-90 disabled:opacity-40"
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
              className="text-muted transition-transform duration-200 ease-bounce hover:scale-125 hover:text-accent-neon active:scale-90 disabled:opacity-40"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M16 6h2v12h-2zM6 6l8.5 6L6 18z" />
              </svg>
            </button>
          </div>
          {controlError && <p className="mt-1 text-[11px] text-danger">{controlError}</p>}
        </>
      ) : (
        <>
          <Teddy className="h-10 w-10" />
          <p className="text-sm text-dim">Nothing playing.</p>
        </>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </Card>
  )
}
