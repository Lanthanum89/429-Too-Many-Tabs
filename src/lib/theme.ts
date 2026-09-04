// Two themes, both greyscale: a light and a dark variant of the same
// interface rather than two designs. Kept in its own module so
// RadarWidget/RainRadarPanel can share the type without importing back into
// App (which imports them).
export type Theme = 'light' | 'dark'

export const THEMES: readonly Theme[] = ['light', 'dark']

export function isTheme(value: string | null): value is Theme {
  return value === 'light' || value === 'dark'
}

// The app briefly shipped four themes: a coloured light/dark pair plus a
// greyscale 'mono'/'mono-dark' pair. The greyscale pair is now the only one,
// under the plain names - so anyone whose browser still has a 'mono' value
// saved lands on the variant they actually chose rather than being bounced
// back to light. Safe to delete once nobody is carrying a stale value.
//
// Compared literally rather than looked up in an object: the argument comes
// from localStorage, so it is whatever anyone has typed into devtools, and a
// `value in table` test answers true for every key inherited from
// Object.prototype - 'toString' would have passed it and returned a function
// where a Theme was promised.
export function readStoredTheme(value: string | null): Theme {
  if (isTheme(value)) return value
  if (value === 'mono') return 'light'
  if (value === 'mono-dark') return 'dark'
  return 'light'
}

// Whether a theme paints light-on-dark. The map basemap is the only thing
// that needs to pick between a light and a dark asset - everything else is
// driven by the CSS custom properties, which don't care.
export function isDarkTheme(theme: Theme): boolean {
  return theme === 'dark'
}

// The colour the browser paints its own chrome with (Android's address bar,
// the PWA's title bar), kept in step with the page rather than pinned to one
// variant's background. Matches --color-void in index.css.
export const THEME_COLORS: Record<Theme, string> = {
  light: '#f2f2f2',
  dark: '#0b0b0b',
}

// Wraps back to the start, so the toggle keeps cycling forever.
export function nextTheme(current: Theme): Theme {
  const index = THEMES.indexOf(current)
  return THEMES[(index + 1) % THEMES.length]
}
