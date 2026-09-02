// Three themes, cycled by the single header toggle rather than a switch:
// 'light' (strawberry), 'dark' (galaxy lilac) and 'mono' (black and white).
// Kept in its own module so RadarWidget/RainRadarPanel can share the type
// without importing back into App (which imports them).
export type Theme = 'light' | 'dark' | 'mono'

export const THEMES: readonly Theme[] = ['light', 'dark', 'mono']

export function isTheme(value: string | null): value is Theme {
  return value === 'light' || value === 'dark' || value === 'mono'
}

// Wraps back to the start, so the toggle keeps cycling forever. Anything
// unrecognised (an older two-theme value, a hand-edited localStorage entry)
// lands on 'light' rather than getting stuck.
export function nextTheme(current: Theme): Theme {
  const index = THEMES.indexOf(current)
  return THEMES[(index + 1) % THEMES.length]
}
