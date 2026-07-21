import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { modes, defaultModeId, type Mode } from './modes'

const STORAGE_KEY = 'life-dashboard:mode'

interface ModeContextValue {
  mode: Mode
  modes: Mode[]
  setModeId: (id: string) => void
}

const ModeContext = createContext<ModeContextValue | null>(null)

function readStoredModeId(): string {
  if (typeof window === 'undefined') return defaultModeId
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored && modes.some((m) => m.id === stored) ? stored : defaultModeId
}

export function ModeProvider({ children }: { children: ReactNode }) {
  const [modeId, setModeId] = useState<string>(readStoredModeId)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, modeId)
  }, [modeId])

  const mode = modes.find((m) => m.id === modeId) ?? modes[0]

  return <ModeContext.Provider value={{ mode, modes, setModeId }}>{children}</ModeContext.Provider>
}

export function useMode(): ModeContextValue {
  const ctx = useContext(ModeContext)
  if (!ctx) throw new Error('useMode must be used within a ModeProvider')
  return ctx
}
