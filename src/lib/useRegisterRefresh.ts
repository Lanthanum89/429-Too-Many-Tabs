import { useCallback, useEffect, useRef, useState } from 'react'
import { useRefreshRegistry } from './refresh'

interface UseRegisterRefreshResult {
  refreshing: boolean
  lastUpdated: Date | null
  refresh: () => Promise<void>
}

/**
 * Wraps a widget's own fetch function so it can be triggered from three
 * places -- the widget's own refresh button, its existing polling interval,
 * and the dashboard header's "refresh everything" button -- while only ever
 * running one at a time and tracking a single shared "last updated" moment.
 *
 * This does NOT own polling. Each widget keeps its existing mount/interval
 * effect untouched (different widgets gate on different things - an OAuth
 * connection, an env var, a selected origin - so a one-size-fits-all timer
 * here would either miss those gates or duplicate them). It only adds:
 * registration with the header's registry, an in-flight guard so overlapping
 * calls collapse into one, and refreshing/lastUpdated state for the button.
 *
 * `fetchFn` is read through a ref that's refreshed every render, so callers
 * don't need to memoize it themselves -- passing a fresh closure each render
 * (capturing whatever local state it needs) is fine and won't go stale.
 *
 * `fetchFn` returns whether it actually succeeded, rather than being a bare
 * `Promise<void>`: every widget's own loader already catches its fetch
 * errors internally (to set its own error state) and resolves normally
 * either way, so a void-returning contract gave this hook no way to tell a
 * real success from a swallowed failure -- lastUpdated was being stamped
 * even when nothing new actually loaded. Have the loader return `false` on
 * failure (see any widget's `load` for the pattern) to keep the timestamp
 * honest.
 */
export function useRegisterRefresh(
  id: string,
  fetchFn: () => Promise<boolean>,
  enabled: boolean = true,
): UseRegisterRefreshResult {
  const { register } = useRefreshRegistry()
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchFnRef = useRef(fetchFn)
  fetchFnRef.current = fetchFn

  // Holds the in-flight run's own promise, not just a boolean -- an
  // overlapping call (the header's global refresh landing on a widget
  // whose own interval is already mid-poll, say) returns this SAME promise
  // rather than resolving immediately, so a caller relying on completion
  // (Promise.allSettled in the registry) actually waits for the real
  // request to finish instead of the global refresh reporting done, and
  // clearing its spinner, before this widget has actually settled.
  const inFlightRef = useRef<Promise<void> | null>(null)

  const refresh = useCallback((): Promise<void> => {
    if (inFlightRef.current) return inFlightRef.current

    const run = (async () => {
      setRefreshing(true)
      try {
        const succeeded = await fetchFnRef.current()
        if (succeeded) setLastUpdated(new Date())
      } finally {
        inFlightRef.current = null
        setRefreshing(false)
      }
    })()

    inFlightRef.current = run
    return run
  }, [])

  useEffect(() => {
    if (!enabled) return undefined
    return register(id, refresh)
  }, [enabled, id, register, refresh])

  return { refreshing, lastUpdated, refresh }
}
