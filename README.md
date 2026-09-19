# 429: Too Many Tabs

A read-only personal dashboard for a phone or tablet propped up on a desk. No backend —
it's a static PWA meant to be hosted on GitHub Pages.

One glanceable page: clock, binary clock, weekly calendar strip, email, Spotify,
weather, a live rain radar, Guardian headlines, live bus departures, a countdown, and a
GitHub activity feed all shown at once — no modes or settings to fiddle with. On a wide
enough window it lays out in four columns with no page scroll; narrower windows fall
back to two columns or a single stacked column that scrolls normally — see
[Layout](#layout) below.

The visual direction is a "sticker" look — hot pink, lilac, and baby-pink accents on
thick black ink borders, rounded keycap-style buttons that lift into a hard offset
shadow on press, small radius corners throughout. Cards themselves stay flat (a border,
no shadow, no hover lift) so only actual controls read as clickable — the sticker lift
effect is reserved for buttons. Two theme variants, flipped by the toggle in the header
and remembered in `localStorage`; the toggle's icon shows what the next press gives you,
not what you're currently on:

| Theme | Look |
| --- | --- |
| `light` | Pale pink cards on white, black ink borders and text |
| `dark` | The same interface with paper and ink swapped: dark plum-grey cards on near-black, cream ink — the pink/lilac/baby-pink accent trio stays identical in both |

Type is [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk) for headings and
display numerals (the greeting, card titles) and [JetBrains
Mono](https://www.jetbrains.com/lp/mono/) for everything that reads as data or chrome —
labels, buttons, the flip clock, temperature, countdown. Both are self-hosted via
`@fontsource` rather than a CDN link, so they're bundled into the build and precached by
the service worker — no external font request needed once installed.

The palette is a block of CSS custom properties in `src/index.css` (`void`, `surface`,
`line`, `ink`, `muted`, `dim`, `accent`, `accent-bright`, `danger`, plus the clock and
flip-clock tokens): light lives in the `@theme` block, dark in a single
`:root[data-theme='dark']` override.

Most of the interface carries the accent palette rather than being neutral — Spotify
album art, the map basemap/marker, and the radar overlay are the exceptions,
desaturated in CSS to keep them from clashing. The radar one is a deliberate trade —
RainViewer colour-codes rain by intensity, so desaturating costs some separation between
drizzle and downpour, with intensity still reading as darkness. Every icon in the app is
a stroked outline on `currentColor`, so icons need no theme-aware code at all.

The clock defaults to 24-hour time (`hour12: false`).

## Widgets

| Widget | What it shows | Refresh |
|---|---|---|
| Clock | Big time display, and the date | — (nothing to fetch) |
| Binary clock | Same binary-coded-decimal format as [Binary Bloom](https://github.com/Lanthanum89/binary-clock) — hours/minutes/seconds each split into tens/ones digits, each digit a column of 4 dots (8-4-2-1). Always 24-hour | — (nothing to fetch) |
| Calendar | The current week as a compact Monday-first strip, with Google Calendar events plotted on their day — click a day to open a popup listing all of its events, each still linking out to Google Calendar | Individual button (once connected) + global |
| Email | Your inbox — read and unread, with star status. Starred messages sort to the top, then everything else newest-first — click a subject to open it in Gmail. Independent unread/starred filter pills, and "Load more" to paginate further back | Individual button (once connected) + global |
| Spotify | Currently-playing track with album art, progress bar, and playlist/album context — plus skip, pause/resume, and shuffle controls (requires Spotify Premium) — see [Spotify](#spotify) below | Individual button (once connected) + global |
| Weather | Current temperature and conditions for your location (via browser geolocation, falling back to London if denied) — feels-like temperature, chance of rain, a five-hour forecast, a next-day summary, and sunrise/sunset/moon phase/UV risk, from [Open-Meteo](https://open-meteo.com) — no API key needed | Individual button + global, every 15 minutes automatically |
| Rain Radar | A live precipitation radar map (via [RainViewer](https://www.rainviewer.com), no key needed) themed to match the dashboard, clamped to RainViewer's native zoom levels — the basemap underneath is [Esri](https://www.esri.com)'s greyscale Canvas tiles, also key-free | Individual button + global, every 10 minutes automatically |
| Guardian Headlines | The latest five headlines from [The Guardian's Open Platform](https://open-platform.theguardian.com), each linking out to the full article | Individual button (once a key is set) + global, every 15 minutes automatically |
| Reading Buses | Live departure times for configured home/work stops from [Reading Buses Open Data](https://reading-opendata.r2p.com/api-service) — see [the CORS workaround](#challenge) below | Individual button (once configured) + global, every 60 seconds automatically in live mode |
| Countdown | A user-set label and target date, with the days remaining | — (user-entered, nothing to fetch) |
| GitHub | A small activity feed — public repos, followers, commits today, and recent public events | Individual button + global, every 15 minutes automatically |

## Refreshing

Two independent levels, both documented here because there's no third:

- **Per-widget**, on each applicable widget above: a small icon button next to its
  title, plus a subtle "Updated 14:32" / "Updated 2m ago" timestamp beside it. Clicking
  it refreshes only that widget, reusing the exact same fetch logic its own automatic
  polling (where it has any) already uses — existing content stays on screen while it
  loads, and a failed refresh keeps showing the last good data rather than blanking the
  widget.
- **Whole-dashboard**, the spinning-arrows button in the header: refreshes every
  connected widget that has a refresh control, concurrently, and only reports done once
  every one of them has either succeeded or failed — one widget's failure never stops
  the others. It does **not** reload the page; nothing here does.

Widgets register their own refresh function with a small context
(`RefreshRegistryProvider` in `src/lib/refresh.tsx`) via a shared hook
(`useRegisterRefresh` in `src/lib/useRegisterRefresh.ts`), so the header button and each
widget's own button end up calling the exact same function — there's no separate
"global refresh" implementation to keep in sync with each widget's own logic. The hook
also guards against overlapping requests for the same widget (a click while one's
already in flight is a no-op) and only ever runs one refresh per widget at a time,
whether it was triggered manually, by the header button, or by the widget's own
polling interval. It doesn't own that polling interval itself, though — each widget
still gates its own auto-refresh on whatever it's already gated on (an OAuth
connection, an env var, a selected stop) rather than a single timer trying to cover
every case.

## Setup

```bash
npm install
cp .env.example .env
```

Then fill in `.env`:

**Google (Calendar + Email):**

1. Go to the [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Create an OAuth client ID of type **Web application**.
3. Enable the **Google Calendar API** and **Gmail API** for the project.
4. Add `http://localhost:5173` as an authorised JavaScript origin for local dev.
5. Copy the client ID into `VITE_GOOGLE_CLIENT_ID`.

**Spotify (now playing):**

1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) and
   create an app.
2. In the app's **Settings**, add a **Redirect URI**. Locally that's
   `http://127.0.0.1:5173/429-Too-Many-Tabs/` — use `127.0.0.1`, not `localhost`; Spotify
   doesn't accept plain `localhost` redirect URIs, and note the trailing slash matters
   (Vite dev serves this app under `/429-Too-Many-Tabs/` too, since `base` is set — see
   [below](#deploying-to-github-pages)). Add the deployed URL the same way once it exists.
3. New Spotify apps start in **Development Mode**, which only lets allow-listed accounts
   authenticate. Under the app's **Users and Access**, add your own Spotify account —
   otherwise the auth flow will reject you even with a correct client ID.
4. Copy the **Client ID** (not the Client Secret — see
   [note below](#a-note-on-api-keys-and-secrets)) into `VITE_SPOTIFY_CLIENT_ID`. The app
   requests `user-read-playback-state`, `user-read-currently-playing`,
   `playlist-read-private`, and `user-modify-playback-state` — all read/modify-your-own
   scopes, nothing needing app review.

```bash
npm run dev
```

Open the app and use the "Connect" buttons on the Calendar/Email/Spotify widgets to
grant access. If you're testing the Spotify widget locally, open the dev server via
`http://127.0.0.1:5173/...` rather than `http://localhost:5173/...` to match the redirect
URI you registered.

### Deploying to GitHub Pages

`.github/workflows/deploy-pages.yml` builds and deploys automatically on every push to
`main` (or on demand from **Actions → Deploy to GitHub Pages → Run workflow**).
`.github/workflows/quality-checks.yml` runs `npm run lint` and `npm run build` on every
push to a branch other than `main` and on every pull request, so a broken branch fails
before it's ever merged rather than at deploy time.
`.github/workflows/malware-scan.yml` runs a signature scan on every push/PR and on a
daily schedule, independent of both. One-time setup for deployment:

1. **Settings → Pages → Source: GitHub Actions.**
2. **Settings → Secrets and variables → Actions → New repository secret** — add both
   `VITE_GOOGLE_CLIENT_ID` and `VITE_SPOTIFY_CLIENT_ID` (same values as your local
   `.env`).
3. Once it's deployed, add the resulting URL — a GitHub Pages project page, so
   `https://<user>.github.io` (just the origin, no path — see the Google Cloud Console's
   "Authorised JavaScript origins" field) — to the Google OAuth client's authorised
   origins, and `https://<user>.github.io/429-Too-Many-Tabs/` (this time *with* the path
   and trailing slash) as a Spotify **Redirect URI**. Skip either and that widget's
   "Connect" button will fail or do nothing.

`vite.config.ts` sets `base: '/429-Too-Many-Tabs/'` to match that project-page URL. If
you ever rename the repo or deploy somewhere else (a custom domain, a user/org root page
at `<user>.github.io`), update that value to match — everything else (asset paths, the
manifest's `start_url`/`scope`) derives from it.

### A note on API keys and secrets

`VITE_GOOGLE_CLIENT_ID` and `VITE_SPOTIFY_CLIENT_ID` are OAuth **client IDs**, not
secrets — both providers' client IDs for public/browser-based clients are meant to be
visible (already exposed in every request the respective auth flow makes) and are safe
to bake into a client build. That's true whether the repo is private or public — repo
visibility doesn't add any protection to a value that ends up compiled into the deployed
bundle.

The Spotify integration (see [below](#spotify)) deliberately uses Authorization Code +
PKCE so it never needs a real client *secret* baked in — only the ID above. **Never put
a Spotify Client Secret in this repo's env or secrets**; this app has no backend to hold
it securely, and a GitHub Actions secret only stays confidential during the CI run — the
moment a `VITE_`-prefixed value is baked into the built JS bundle, it ships in plaintext
to every browser that loads the deployed site, secret or not. If any future integration
does need a genuine secret (a confidential OAuth client secret, a rate-limited/paid API
key), it must **not** go into client-side code at all — anyone can extract it straight
from the built JS bundle. That would need a small backend/serverless proxy to hold the
secret server-side, which is a deliberate departure from this project's "no backend"
design — worth doing only if a specific integration actually requires it.

## Architecture

`App.tsx` renders every widget, always — there's no mode/layout switching. Each widget is
mostly self-contained: it manages its own connect/loading/error state and decides its own
content, opting into the shared refresh registry (`src/lib/refresh.tsx`,
`src/lib/useRegisterRefresh.ts`) where it has something worth refreshing on demand. A
couple of small shared pieces exist purely to avoid repeating the same markup/logic
across widgets: `src/components/RefreshButton.tsx` (the icon button and its spinner) and
`src/lib/formatUpdated.ts` (the "Updated 14:32" / "Updated 2m ago" formatter).

### Layout

The whole page is one CSS grid (`.dashboard` in `src/index.css`), using named
`grid-template-areas` so the same set of widgets can be arranged completely differently
at different breakpoints without touching the JSX:

1. **Default (phones, anything under 640px):** single column, everything stacked in a
   sensible reading order, page scrolls normally.
2. **640px and up, excluding the portrait-tablet case below:** two columns — Binary
   pairs with Weather, Calendar with the commit-graph widget, Email with Guardian —
   everything else stays full-width.
3. **640–1024px in portrait** (a tall tablet, held upright): falls back to the same
   single-column stack as the default, since pairing widgets side by side only makes
   sense when there's spare *width* relative to height, not just absolute width.
4. **1025px and up** (a landscape tablet or desktop): four columns. Clock and
   Calendar/commits share the top row; a left-hand "stack" (Spotify+Binary, Weather,
   Countdown, GitHub) spans the two left columns down the remaining rows; Email fills
   column 3 down to the bottom; Guardian and Rain Radar stack in column 4. The whole
   page is `100dvh` with no page-level scroll — Email and Rain Radar each get their own
   internal scroll as a fallback if their content doesn't fit.

There's no outer `max-width` — the dashboard fills whatever width it's given, from a
small tablet in landscape up to an ultrawide monitor. Layout 4's columns are proportional
(`0.6fr 0.6fr 1.2fr 1.2fr`), not fixed widths, so it scales with the window rather than
leaving dead space on a very wide screen.

The big retro clock digits are sized in `vw` for the full-width layouts (1–3), but that
breaks down in layout 4's narrower left-hand stack — `vw` is relative to the whole
viewport, not the stack's actual (now-variable) width, so it read far too large there.
The 1025px breakpoint overrides `.clock-display` with a flat size instead of fighting it
with container queries.

### Adding a widget

1. Build the component under `src/components/`, following the existing widgets' shape
   (a `Card`, a `Connect` button gated on a `hasValid*Token()`/`isConnected()` check if it
   needs auth, its own loading/error state).
2. Add it to the JSX in `src/App.tsx`, wrapped in a `<div className="dashboard-<name>">`.
3. Give it a `grid-area: <name>` rule in `src/index.css`, and slot that name into each of
   the four `.dashboard` breakpoints' `grid-template-areas` wherever it makes sense.
4. If it fetches anything worth refreshing on demand, call `useRegisterRefresh('<name>',
   yourFetchFn, enabledCondition)` and render a `<RefreshButton>` next to its title —
   see any of Weather/GitHub/Guardian for the pattern. Skip this for a widget with
   nothing to fetch (Clock, Binary Clock, Countdown).

No registry beyond the refresh one above, no per-mode sizing — just the one grid to
update.

## Known gaps / decisions to revisit

- **Google auth is implicit-flow only.** Tokens are cached in `localStorage` (see
  `lib/googleAuth.ts`) so a reload within the token's own ~1hr lifetime restores the
  widget automatically instead of forcing a reconnect — but there's still no refresh
  token with this flow, so once it actually expires, the "Connect" button will
  reappear. This keeps the app backend-free, which was the point — but if the hourly
  reconnect gets annoying for daily use, the fix is a small token-refresh proxy (that
  would need a backend, i.e. no longer purely static).
- **Gmail widget fetches message metadata one request per message** (no batching).
  Fine at 5-10 unread; switch to the Gmail API's `batch` endpoint
  (`src/lib/gmail.ts`) if that list grows.
- **Week calendar fetches up to 250 events per week** in one request — plenty for a
  personal calendar, but not paginated if a week ever has more than that.
- **No tests.**
- **PWA icons (`public/icon-192.png`/`icon-512.png`) are a generated placeholder**
  (three stacked bars in the accent colour) — good enough to satisfy installability,
  swap for a real design whenever you make one.
- **Spotify apps start in "Development Mode"**, capped at 25 allow-listed users. Fine
  for personal use (see [Setup](#setup)); submitting for extension/quota review is only
  worth doing if this ever needs to work for accounts you don't control.
- **Reading Buses has no CORS support at all** (confirmed in the browser, not assumed),
  so live departures need the Cloudflare Worker proxy in
  `cloudflare-worker/reading-buses-proxy/` deployed and its URL set in
  `VITE_READING_BUSES_PROXY_URL`. Without it, the widget falls back to showing the
  configured stops with static labels and a link out to the operator's own
  live-departures page, so the feature degrades gracefully instead of breaking.
- **The GitHub widget's username is hardcoded** (`src/lib/github.ts`) rather than an env
  var or repo variable — this is a single-user personal dashboard, so a constant was
  simpler than a setting that would only ever be set once.
- **The dashboard-wide refresh button has no per-widget error summary** — if one widget
  fails during a whole-dashboard refresh, that widget shows its own error state as
  usual, but the header button itself doesn't report "7 of 8 succeeded" anywhere. Fine
  at today's widget count; worth a small summary if it ever grows much further.

### Spotify

`SpotifyWidget` talks to the Spotify Web API directly (`src/lib/spotify.ts`) using
Authorization Code + PKCE — Spotify doesn't support the simpler implicit/token-client
flow `googleAuth.ts` uses for Google, so this one does its own thing: generate a PKCE
code verifier/challenge, redirect to Spotify's authorize page, and exchange the returned
code for tokens on redirect back (handled once in `main.tsx` via `handleRedirect()`,
before the app renders). Access and refresh tokens are cached in `localStorage`, along
with the scope string Spotify's token response actually granted;
`fetchCurrentlyPlaying` refreshes the access token automatically once it's stale.

Playback state comes from `/v1/me/player`, not the narrower `/currently-playing`
endpoint — its response includes `shuffle_state`, so the shuffle button reflects
Spotify's real state (including shuffle toggled from another device) rather than a
value only this widget ever set. Toggling shuffle flips the button optimistically, then
resyncs against Spotify's actual state once the request settles, whether it succeeded
or failed — so a failed toggle reverts instead of leaving the button showing the wrong
thing.

Reading `/v1/me/player` needs the `user-read-playback-state` scope, which didn't exist
in earlier versions of this app. A token connected before that scope was added has no
way to satisfy it: the widget checks the token's stored granted-scopes before making the
request and, if it's missing (or Spotify itself refuses the request as
scope-insufficient), shows a "Reconnect Spotify" prompt instead of a generic error or a
silent failure. Reconnecting clears the stale token and re-runs the normal connect flow
under the current scope list — no manual site-data clearing needed. There's no separate
"disconnect" button beyond that reconnect flow; revoking access entirely still has to be
done from your [Spotify account's connected-apps
settings](https://www.spotify.com/account/apps/).

See [Setup](#setup) above for creating the Spotify app and registering redirect URIs.

## Stack

React + TypeScript + Vite, Tailwind v4 via the `@tailwindcss/vite` plugin,
`vite-plugin-pwa` for installability. No third-party state library (the refresh registry
is a small built-in `React.createContext`, not a dependency), no router — it's a single
page.
