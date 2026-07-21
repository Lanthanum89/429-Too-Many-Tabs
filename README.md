# Life Dashboard

A read-only personal dashboard for a phone or tablet propped up on a desk. No backend —
it's a static PWA meant to be hosted on GitHub Pages.

The core idea is **modes, not themes**: instead of picking a colour scheme, you pick a
functional layout — *Working*, *Chilling*, *Gaming* — and the dashboard changes which
widgets show and how big they are.

Visual style is mid-century modern: warm walnut/cream/mustard palette (`src/index.css`'s
`@theme` block — `walnut`, `cream`, `mustard`, `terracotta`, `olive`), Jost (a
Futura-inspired geometric sans) for headings and the clock, Work Sans for body text.
Both fonts are self-hosted via `@fontsource` rather than a CDN link, so they're bundled
into the build and precached by the service worker like everything else — no external
font request needed once installed. The clock defaults to 24-hour time
(`hour12: false`), matched by Calendar's event times for consistency.

## Widgets

| Widget | What it shows |
|---|---|
| Clock | Time, and (space permitting) the date |
| To-do | A simple localStorage-only to-do list |
| Calendar | Upcoming Google Calendar events (read-only) |
| Email | Unread Gmail subjects (read-only) |
| Spotify | Currently-playing track (read-only) — see [Spotify](#spotify) below |

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
   [note below](#a-note-on-api-keys-and-secrets)) into `VITE_SPOTIFY_CLIENT_ID`.

```bash
npm run dev
```

Open the app and use the "Connect" buttons on the Calendar/Email/Spotify widgets to
grant access. If you're testing the Spotify widget locally, open the dev server via
`http://127.0.0.1:5173/...` rather than `http://localhost:5173/...` to match the redirect
URI you registered.

### Deploying to GitHub Pages

`.github/workflows/deploy-pages.yml` builds and deploys automatically on every push to
`main` (or on demand from **Actions → Deploy to GitHub Pages → Run workflow**). One-time
setup:

1. **Settings → Pages → Source: GitHub Actions.**
2. **Settings → Secrets and variables → Actions → New repository secret** — add both
   `VITE_GOOGLE_CLIENT_ID` and `VITE_SPOTIFY_CLIENT_ID` (same values as your local
   `.env`; also used by the Android workflow, so you only need to set them once).
3. Once it's deployed, add the resulting URL — a GitHub Pages project page, so
   `https://<user>.github.io` (just the origin, no path — see the Google Cloud Console's
   "Authorised JavaScript origins" field) — to the Google OAuth client's authorised
   origins, and `https://<user>.github.io/429-Too-Many-Tabs/` (this time *with* the path
   and trailing slash) as a Spotify **Redirect URI**. Skip either and that widget's
   "Connect" button will fail or do nothing.

`vite.config.ts` sets `base: '/429-Too-Many-Tabs/'` (for the normal `npm run build`) to
match that project-page URL. If you ever rename the repo or deploy somewhere else (a
custom domain, a user/org root page at `<user>.github.io`), update the non-Capacitor
branch of that conditional to match — everything else (asset paths, the manifest's
`start_url`/`scope`) derives from that one value.

### Building an Android APK

The app is also wrapped with [Capacitor](https://capacitorjs.com) (see `android/`), which
bundles the built `dist/` straight into a native shell — no hosting required, the app
just opens a local copy of the same code that runs in the browser.

Capacitor serves that bundle from its own WebView origin (`https://localhost/` by
default) rather than under `/429-Too-Many-Tabs/`, so it needs a *different* Vite `base`
than the Pages build — `npm run build:capacitor` passes `--mode capacitor` for this,
which `vite.config.ts` picks up to use `base: '/'` instead. **Always build the Android
app with `build:capacitor`, never plain `build`** — the latter would 404 on all its own
JS/CSS once installed, since none of the asset paths would match where Capacitor
actually serves files from.

A GitHub Actions workflow (`.github/workflows/build-android.yml`) builds a debug APK on
every push to `main`, or on demand from the Actions tab (**Actions → Build Android APK →
Run workflow**). It reuses the same `VITE_GOOGLE_CLIENT_ID` and `VITE_SPOTIFY_CLIENT_ID`
repo secrets described above (see [note on secrets](#a-note-on-api-keys-and-secrets) below
— both are client IDs, not confidential, safe to store this way). If you want Calendar,
Email, or Spotify to actually work inside the installed APK (not just the web version),
add `https://localhost` as a Google-authorised JavaScript origin and `https://localhost/`
as a Spotify redirect URI too — that's the origin Capacitor's WebView runs at by default.

Once the workflow run finishes, download the `life-dashboard-debug-apk` artifact from the
run's summary page, transfer the `.apk` to the phone, and install it (Android will need
"install unknown apps" enabled for whatever app you used to open the file).

This produces a **debug-signed** APK — fine for installing on your own device, but each
CI run's debug key may differ, and it isn't set up for a Play Store release. If you want
a stable signing identity across rebuilds (so updates install over the old copy instead
of needing a fresh uninstall/reinstall), generate a release keystore, store it (and its
passwords) as repo secrets, and add a `signingConfig` to `android/app/build.gradle` — not
done here to avoid managing a keystore for a single-user personal app.

This sandbox couldn't produce the `.apk` directly — building Android requires the
Android SDK, which isn't reachable from here, only from GitHub's own runners.

#### A note on API keys and secrets

`VITE_GOOGLE_CLIENT_ID` and `VITE_SPOTIFY_CLIENT_ID` are OAuth **client IDs**, not
secrets — both providers' client IDs for public/browser-based clients are meant to be
visible (already exposed in every request the respective auth flow makes) and are safe
to bake into a client build. That's true whether the build is a hosted PWA, a wrapped
APK, or in a private or public repo — repo visibility doesn't add any protection to a
value that ends up compiled into the artifact you install.

The Spotify integration (see [below](#spotify)) deliberately uses Authorization Code +
PKCE so it never needs a real client *secret* baked in — only the ID above. **Never put
a Spotify Client Secret in this repo's env or secrets**; this app has no backend to hold
it securely, and a GitHub Actions secret only stays confidential during the CI run — the
moment a `VITE_`-prefixed value is baked into the built JS bundle, it ships in plaintext
to every browser that loads the deployed site, secret or not. If any future integration
does need a genuine secret (a confidential OAuth client secret, a rate-limited/paid API
key), it must **not** go into client-side code at all — anyone holding the APK or the
built JS bundle can extract it (an APK is just a zip file). That would need a small
backend/serverless proxy to hold the secret server-side, which is a deliberate departure
from this project's "no backend" design — worth doing only if a specific integration
actually requires it.

## Architecture

`src/theme/modes.ts` is the single source of truth for layout. Each mode is:

```ts
{ id, label, blurb, widgets: Record<WidgetId, 'hidden' | 'sm' | 'md' | 'lg'> }
```

`ModeContext` holds the currently active mode (persisted to `localStorage`) and exposes
`mode`, `modes`, and `setModeId`. `App.tsx` reads the active mode and, for every widget
that isn't `'hidden'`, renders it with a `size` prop.

Each widget decides its own content and layout from `size` — there's no shared sizing
logic beyond the grid column span in `App.tsx`. For example:

- `Clock` drops the date line at `sm`, and scales its font size with `size`.
- `TodoList` filters to undone-only and drops the add-task input at `sm`, and caps how
  many items it shows at `sm`/`md`.
- `CalendarWidget`/`EmailWidget` request fewer results at smaller sizes.

### Adding or editing a mode

Add (or edit) an entry in the `modes` array in `src/theme/modes.ts`. That's the whole
change — the mode switcher in `App.tsx` and the widgets themselves pick it up
automatically.

### Adding a widget

1. Add its id to `WidgetId` and `WIDGET_IDS` in `src/theme/modes.ts`.
2. Give it a size in every existing mode's `widgets` map (TypeScript will tell you if
   you miss one).
3. Build the component under `src/components/`, accepting a `size: Exclude<WidgetSize,
   'hidden'>` prop and rendering itself accordingly.
4. Add it to `WIDGET_ORDER` and the render switch in `src/App.tsx`.

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
- **No tests.**
- **PWA icons (`public/icon-192.png`/`icon-512.png`) are a generated placeholder**
  (three stacked bars, nodding to the sm/md/lg widget sizing) — good enough to satisfy
  installability, swap for a real design whenever you make one.
- **The Android APK still uses Capacitor's default launcher icon**, not the PWA one
  above. Swap the files under `android/app/src/main/res/mipmap-*` too if you want them
  to match.
- **Spotify apps start in "Development Mode"**, capped at 25 allow-listed users. Fine
  for personal use (see [Setup](#setup)); submitting for extension/quota review is only
  worth doing if this ever needs to work for accounts you don't control.
- **Spotify refresh tokens are cached in `localStorage` indefinitely** — there's no
  explicit "disconnect" button, so revoking access has to be done from your
  [Spotify account's connected-apps settings](https://www.spotify.com/account/apps/) (or
  by clearing site data) rather than from the dashboard itself.

### Spotify

`SpotifyWidget` talks to the Spotify Web API directly (`src/lib/spotify.ts`) using
Authorization Code + PKCE — Spotify doesn't support the simpler implicit/token-client
flow `googleAuth.ts` uses for Google, so this one does its own thing: generate a PKCE
code verifier/challenge, redirect to Spotify's authorize page, and exchange the returned
code for tokens on redirect back (handled once in `main.tsx` via `handleRedirect()`,
before the app renders). Access and refresh tokens are cached in `localStorage`;
`fetchCurrentlyPlaying` refreshes automatically when the access token's stale. See
[Setup](#setup) above for creating the Spotify app and registering redirect URIs.

## Stack

React + TypeScript + Vite, Tailwind v4 via the `@tailwindcss/vite` plugin,
`vite-plugin-pwa` for installability, Capacitor for the optional Android APK build. No
state library, no router — it's a single page.
