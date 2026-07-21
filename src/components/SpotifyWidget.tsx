import { Card } from './Card'
import type { WidgetSize } from '../theme/modes'

// Stub — wire this up to the Spotify stats app's now-playing endpoint once
// it's hosted, or the Spotify Web API directly with Auth Code + PKCE
// (mirror lib/googleCalendar.ts's token-request pattern). See README.
export function SpotifyWidget({ size }: { size: Exclude<WidgetSize, 'hidden'> }) {
  return (
    <Card className="flex flex-col items-center justify-center gap-1 text-center">
      <h2 className="text-sm font-medium text-gray-400">Spotify</h2>
      <p className="text-sm text-gray-500">Not wired up yet.</p>
      {size !== 'sm' && (
        <p className="text-xs text-gray-600">
          Hook this up to the Spotify stats app or the Spotify Web API — see README.
        </p>
      )}
    </Card>
  )
}
