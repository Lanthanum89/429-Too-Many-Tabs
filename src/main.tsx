import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { ModeProvider } from './theme/ModeContext.tsx'
import { handleRedirect } from './lib/spotify.ts'
import './index.css'

// Resolve any pending Spotify auth redirect before the first render, so
// SpotifyWidget never has to race the token exchange on mount.
handleRedirect()
  .catch(() => {})
  .finally(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <ModeProvider>
          <App />
        </ModeProvider>
      </StrictMode>,
    )
  })
