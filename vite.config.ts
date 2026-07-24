import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serves project pages from /<repo-name>/, not the domain root,
// so every root-relative path (assets, manifest start_url/scope, the icon
// link in index.html) has to be prefixed with this — EXCEPT the Capacitor
// Android build, which serves the bundled app from its own WebView root
// (https://localhost/) regardless of repo name, so it needs base: '/'.
// `npm run build:capacitor` (used by build-android.yml) passes --mode
// capacitor to select that.
export default defineConfig(({ mode }) => {
  const base = mode === 'capacitor' ? '/' : '/429-Too-Many-Tabs/'

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
        manifest: {
          name: '429: Too Many Tabs',
          short_name: '429',
          description: 'Read-only personal dashboard: clock, to-do, calendar, email, Spotify.',
          theme_color: '#0b0a0f',
          background_color: '#0b0a0f',
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
