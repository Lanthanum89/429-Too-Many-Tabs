// Four themes, cycled by the single header toggle rather than a switch:
// 'light' (strawberry), 'dark' (galaxy lilac), then the black-and-white pair
// 'mono' and 'mono-dark'. Kept in its own module so RadarWidget/
// RainRadarPanel can share the type without importing back into App (which
// imports them).
export type Theme = 'light' | 'dark' | 'mono' | 'mono-dark'

export const THEMES: readonly Theme[] = ['light', 'dark', 'mono', 'mono-dark']

export function isTheme(value: string | null): value is Theme {
  return THEMES.includes(value as Theme)
}

// Whether a theme paints light-on-dark. The map basemap is the only thing
// that needs to pick between a light and a dark asset - everything else is
// driven by the CSS custom properties, which don't care.
export function isDarkTheme(theme: Theme): boolean {
  return theme === 'dark' || theme === 'mono-dark'
}

// Wraps back to the start, so the toggle keeps cycling forever. Anything
// unrecognised (an older two-theme value, a hand-edited localStorage entry)
// lands on 'light' rather than getting stuck.
export function nextTheme(current: Theme): Theme {
  const index = THEMES.indexOf(current)
  return THEMES[(index + 1) % THEMES.length]
}
