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
 */
export function useRegisterRefresh(
  id: string,
  fetchFn: () => Promise<void>,
  enabled: boolean = true,
): UseRegisterRefreshResult {
  const { register } = useRefreshRegistry()
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchFnRef = useRef(fetchFn)
  fetchFnRef.current = fetchFn

  const inFlightRef = useRef(false)

  const refresh = useCallback(async () => {
    // Collapse overlapping calls (e.g. the widget's own button clicked while
    // the global refresh is already mid-flight for it) into the one in
    // progress, rather than firing a second concurrent request.
    if (inFlightRef.current) return
    inFlightRef.current = true
    setRefreshing(true)
    try {
      await fetchFnRef.current()
      setLastUpdated(new Date())
    } finally {
      inFlightRef.current = false
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return undefined
    return register(id, refresh)
  }, [enabled, id, register, refresh])

  return { refreshing, lastUpdated, refresh }
}
