# Reading Buses CORS proxy

The r2p.com API doesn't send CORS headers, so the dashboard (a static site,
no backend of its own) can't call it directly from the browser. This Worker
does the request server-side and adds the header itself, and holds the real
API token as a Worker secret instead of it living in the dashboard's public
JS bundle.

## Deploy (one-time)

1. Create a free account at https://dash.cloudflare.com if you don't have one.
2. `npm install -g wrangler` (or use `npx wrangler` in the commands below).
3. From this directory (`cloudflare-worker/reading-buses-proxy`):
   ```
   wrangler login
   wrangler secret put READING_BUSES_API_TOKEN
   ```
   Paste your real r2p.com API key when prompted - it's stored encrypted on
   Cloudflare's side, never in this repo.
4. `wrangler deploy`
5. Wrangler prints the Worker's URL, something like:
   `https://reading-buses-proxy.<your-subdomain>.workers.dev`

## Wire it into the dashboard

Set `VITE_READING_BUSES_PROXY_URL` to that URL (no trailing slash) - as a
GitHub repo secret for the deployed build, and in `.env.local` for local dev.
`VITE_READING_BUSES_API_KEY` is no longer needed by the dashboard itself.

## Updating

If you change `worker.js`, redeploy with `wrangler deploy` from this
directory. If the dashboard's deployed URL ever changes, update
`ALLOWED_ORIGINS` in `wrangler.toml` and redeploy.
