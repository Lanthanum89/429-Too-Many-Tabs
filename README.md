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

### Spotify

`SpotifyWidget` is a stub. Two ways to wire it up for real:

1. Point it at a hosted now-playing endpoint from a separate Spotify stats app, if one
   exists.
2. Talk to the Spotify Web API directly using Authorization Code + PKCE (Spotify
   doesn't support the simpler implicit/token-client flow `googleAuth.ts` uses for
   Google). Mirror the token-caching pattern in `src/lib/googleCalendar.ts`.

## Stack

React + TypeScript + Vite, Tailwind v4 via the `@tailwindcss/vite` plugin,
`vite-plugin-pwa` for installability. No state library, no router — it's a single page.
