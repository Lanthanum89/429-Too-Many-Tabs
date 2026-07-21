export type WidgetId = 'clock' | 'todo' | 'calendar' | 'email' | 'spotify'
export type WidgetSize = 'hidden' | 'sm' | 'md' | 'lg'

export interface Mode {
  id: string
  label: string
  blurb: string
  widgets: Record<WidgetId, WidgetSize>
}

export const WIDGET_IDS: WidgetId[] = ['clock', 'todo', 'calendar', 'email', 'spotify']

// The single source of truth for the dashboard's layouts. Add a mode by
// adding an entry here; nothing else needs to change. Each widget reads its
// own `size` prop and decides what to render — this file only says how big.
export const modes: Mode[] = [
  {
    id: 'working',
    label: 'Working',
    blurb: 'Focus mode — to-dos and calendar up front, everything else out of the way.',
    widgets: {
      clock: 'sm',
      todo: 'lg',
      calendar: 'lg',
      email: 'md',
      spotify: 'hidden',
    },
  },
  {
    id: 'chilling',
    label: 'Chilling',
    blurb: 'Relaxed overview — a bit of everything, nothing urgent.',
    widgets: {
      clock: 'md',
      todo: 'md',
      calendar: 'md',
      email: 'sm',
      spotify: 'md',
    },
  },
  {
    id: 'gaming',
    label: 'Gaming',
    blurb: 'Glanceable only — the time and what’s playing, nothing else.',
    widgets: {
      clock: 'lg',
      todo: 'hidden',
      calendar: 'hidden',
      email: 'hidden',
      spotify: 'lg',
    },
  },
]

export const defaultModeId = modes[0].id
