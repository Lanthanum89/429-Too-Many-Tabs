# Life Dashboard

A read-only personal dashboard for a phone or tablet propped up on a desk. No backend —
it's a static PWA meant to be hosted on GitHub Pages.

The core idea is **modes, not themes**: instead of picking a colour scheme, you pick a
functional layout — *Working*, *Chilling*, *Gaming* — and the dashboard changes which
widgets show and how big they are.

## Widgets

| Widget | What it shows |
|---|---|
| Clock | Time, and (space permitting) the date |
| To-do | A simple localStorage-only to-do list |
| Calendar | Upcoming Google Calendar events (read-only) |
| Email | Unread Gmail subjects (read-only) |
| Spotify | Stub — see [Spotify](#spotify) below |

## Setup

```bash
npm install
cp .env.example .env
```

Then fill in `.env`:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Create an OAuth client ID of type **Web application**.
3. Enable the **Google Calendar API** and **Gmail API** for the project.
4. Add `http://localhost:5173` as an authorised JavaScript origin for local dev.
5. Copy the client ID into `VITE_GOOGLE_CLIENT_ID`.

```bash
npm run dev
```

Open the app and use the "Connect" buttons on the Calendar/Email widgets to grant access.

### Deploying to GitHub Pages

After deploying, add the deployed origin (e.g. `https://<user>.github.io`) to the OAuth
client's authorised JavaScript origins in the Cloud Console. If you skip this, Google
auth fails silently — the "Connect" buttons won't do anything.

### Building an Android APK

The app is also wrapped with [Capacitor](https://capacitorjs.com) (see `android/`), which
bundles the built `dist/` straight into a native shell — no hosting required, the app
just opens a local copy of the same code that runs in the browser.

A GitHub Actions workflow (`.github/workflows/build-android.yml`) builds a debug APK on
every push to `main`, or on demand from the Actions tab (**Actions → Build Android APK →
Run workflow**). It needs one repo secret:

1. **Settings → Secrets and variables → Actions → New repository secret**
2. Name: `VITE_GOOGLE_CLIENT_ID`, value: the same OAuth client ID from `.env` (see
   [note on secrets](#a-note-on-api-keys-and-secrets) below — this one is safe to store
   this way, it's not confidential).

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

`VITE_GOOGLE_CLIENT_ID` is an OAuth **client ID**, not a secret — Google's client IDs for
public/web clients are meant to be visible (it's already exposed in the redirect URL
every time the auth flow runs) and are safe to bake into a client build. That's true
whether the build is a hosted PWA, a wrapped APK, or in a private or public repo —
repo visibility doesn't add any protection to a value that ends up compiled into the
artifact you install.

The Spotify integration (see [below](#spotify)) is specced to use Authorization Code +
PKCE specifically so it never needs a real client *secret* baked in. If any future
integration does need a genuine secret (a confidential OAuth client secret, a
rate-limited/paid API key), it must **not** go into client-side code at all — anyone
holding the APK or the built JS bundle can extract it (an APK is just a zip file). That
would need a small backend/serverless proxy to hold the secret server-side, which is a
deliberate departure from this project's "no backend" design — worth doing only if a
specific integration actually requires it.

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

- **Google auth is implicit-flow only.** Tokens expire after about an hour with no
  silent refresh, so you'll see the "Connect" button reappear periodically. This keeps
  the app backend-free, which was the point — but if the reconnect prompt gets
  annoying for daily use, the fix is a small token-refresh proxy (that would need a
  backend, i.e. no longer purely static).
- **No PWA icons yet.** `icon-192.png` and `icon-512.png` are referenced in
  `vite.config.ts`'s manifest but don't exist in `public/` — the app will install with a
  blank icon until they're added.
- **Gmail widget fetches message metadata one request per message** (no batching).
  Fine at 5-10 unread; switch to the Gmail API's `batch` endpoint
  (`src/lib/gmail.ts`) if that list grows.
- **No tests.**
- **The Android APK uses Capacitor's default launcher icon.** Swap the files under
  `android/app/src/main/res/mipmap-*` (and the PWA icons above) for a real icon whenever
  you get around to making one.

### Spotify

`SpotifyWidget` is a stub. Two ways to wire it up for real:

1. Point it at a hosted now-playing endpoint from a separate Spotify stats app, if one
   exists.
2. Talk to the Spotify Web API directly using Authorization Code + PKCE (Spotify
   doesn't support the simpler implicit/token-client flow `googleAuth.ts` uses for
   Google). Mirror the token-caching pattern in `src/lib/googleCalendar.ts`.

## Stack

React + TypeScript + Vite, Tailwind v4 via the `@tailwindcss/vite` plugin,
`vite-plugin-pwa` for installability, Capacitor for the optional Android APK build. No
state library, no router — it's a single page.
