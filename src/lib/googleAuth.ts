// Shared Google Identity Services (GIS) token client. Calendar and Gmail each
// request their own scope through this and get back a short-lived (~1hr)
// access token — see the README for why this stays implicit-flow only.

let scriptLoadPromise: Promise<void> | null = null

function loadGisScript(): Promise<void> {
  if (scriptLoadPromise) return scriptLoadPromise
  scriptLoadPromise = new Promise((resolve, reject) => {
    if (document.getElementById('gis-script')) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.id = 'gis-script'
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'))
    document.head.appendChild(script)
  })
  return scriptLoadPromise
}

export interface GoogleToken {
  accessToken: string
  expiresAt: number
}

const tokenClients = new Map<string, google.accounts.oauth2.TokenClient>()

export async function requestGoogleToken(scope: string): Promise<GoogleToken> {
  await loadGisScript()

  return new Promise((resolve, reject) => {
    let client = tokenClients.get(scope)
    if (!client) {
      client = window.google.accounts.oauth2.initTokenClient({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        scope,
        callback: () => {},
      })
      tokenClients.set(scope, client)
    }

    client.callback = (response) => {
      if (response.error) {
        reject(new Error(response.error))
        return
      }
      resolve({
        accessToken: response.access_token,
        expiresAt: Date.now() + response.expires_in * 1000,
      })
    }

    client.requestAccessToken()
  })
}
