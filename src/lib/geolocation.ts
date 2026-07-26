// Central London — used only if geolocation is unavailable or denied.
export const FALLBACK_LAT = 51.5074
export const FALLBACK_LON = -0.1278

export interface Coords {
  lat: number
  lon: number
}

export function getCoords(): Promise<Coords> {
  if (!navigator.geolocation) {
    return Promise.resolve({ lat: FALLBACK_LAT, lon: FALLBACK_LON })
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => resolve({ lat: FALLBACK_LAT, lon: FALLBACK_LON }),
      { timeout: 5000 },
    )
  })
}
