import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serves project pages from /<repo-name>/, not the domain root,
// so every root-relative path (assets, manifest start_url/scope, the icon
// link in index.html) has to be prefixed with this.
export default defineConfig(({ mode }) => {
  const base = '/429-Too-Many-Tabs/'

  return {
    base,
    // react-draggable/react-resizable (used by the dashboard's drag-and-resize
    // edit mode) read process.env.NODE_ENV directly for their internal debug
    // logging; Vite doesn't polyfill `process` like Webpack/CRA did, so
    // without this define the reference throws ReferenceError at the top of
    // every drag/resize event handler and silently aborts the whole gesture.
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode === 'production' ? 'production' : 'development'),
    },
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        // autoUpdate alone still leaves a new service worker "waiting" until
        // every open tab/instance of the old one closes — on a PWA someone
        // just leaves open (or reopens without a full quit), that can mean
        // running a stale worker, and therefore a stale cached JS/CSS
        // bundle, far longer than expected. skipWaiting + clientsClaim make
        // a newly installed worker activate and take control immediately.
        workbox: {
          skipWaiting: true,
          clientsClaim: true,
        },
        manifest: {
          name: '429: Too Many Tabs',
          short_name: '429',
          description: 'Read-only personal dashboard: clock, to-do, calendar, email, Spotify.',
          theme_color: '#ffffff',
          background_color: '#ffffff',
          display: 'standalone',
          start_url: base,
          scope: base,
          icons: [
            { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
      }),
    ],
  }
})
