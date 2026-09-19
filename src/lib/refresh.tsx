import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

type RefreshFn = () => Promise<void>

interface RefreshRegistryValue {
  register: (id: string, fn: RefreshFn) => () => void
  refreshAll: () => Promise<void>
  refreshingAll: boolean
  lastCompletedAll: Date | null
}

const RefreshRegistryContext = createContext<RefreshRegistryValue | null>(null)

// A tiny pub/sub so the header's "refresh everything" button can invoke every
// connected widget's own refresh function without either side importing the
// other. Widgets register/unregister themselves via useRegisterRefresh; the
// registry itself never touches a widget's data or fetch logic, it only
// holds a callback per widget id.
export function RefreshRegistryProvider({ children }: { children: ReactNode }) {
  // A ref, not state: registering a widget must never itself trigger a
  // re-render of every consumer of this context.
  const widgetsRef = useRef(new Map<string, RefreshFn>())
  const [refreshingAll, setRefreshingAll] = useState(false)
  const [lastCompletedAll, setLastCompletedAll] = useState<Date | null>(null)

  const register = useCallback((id: string, fn: RefreshFn) => {
    widgetsRef.current.set(id, fn)
    return () => {
      // Only remove if this registration is still the current one -- guards
      // against a fast unmount/remount (e.g. React StrictMode, or a toggled
      // "enabled" flag) racing and having the old cleanup delete the new
      // registration.
      if (widgetsRef.current.get(id) === fn) widgetsRef.current.delete(id)
    }
  }, [])

  const refreshAll = useCallback(async () => {
    setRefreshingAll(true)
    try {
      const fns = Array.from(widgetsRef.current.values())
      // allSettled, not all -- one widget's failure must never stop the
      // others from refreshing, and completion must wait for every one of
      // them regardless of outcome.
      await Promise.allSettled(fns.map((fn) => fn()))
    } finally {
      setRefreshingAll(false)
      setLastCompletedAll(new Date())
    }
  }, [])

  return (
    <RefreshRegistryContext.Provider value={{ register, refreshAll, refreshingAll, lastCompletedAll }}>
      {children}
    </RefreshRegistryContext.Provider>
  )
}

export function useRefreshRegistry(): RefreshRegistryValue {
  const ctx = useContext(RefreshRegistryContext)
  if (!ctx) throw new Error('useRefreshRegistry must be used within a RefreshRegistryProvider')
  return ctx
}
