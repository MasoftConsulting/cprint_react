'use client'

import { useEffect, useRef, useState } from 'react'
import type { Map as LeafletMap, Marker } from 'leaflet'
import 'leaflet/dist/leaflet.css'

import { FieldError } from '@/components/ui/field-error'

/** Centre par défaut : Lomé, comme dans les formulaires Blade d'origine. */
const DEFAULT_LATITUDE = 6.1319
const DEFAULT_LONGITUDE = 1.2228

type Props = {
  defaultLatitude: number | null
  defaultLongitude: number | null
  errors?: { latitude?: string[]; longitude?: string[] }
}

export function CoordinatesPicker({ defaultLatitude, defaultLongitude, errors }: Props) {
  const [latitude, setLatitude] = useState(String(defaultLatitude ?? DEFAULT_LATITUDE))
  const [longitude, setLongitude] = useState(String(defaultLongitude ?? DEFAULT_LONGITUDE))
  const [geolocationError, setGeolocationError] = useState<string | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const markerRef = useRef<Marker | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let cancelled = false
    let cleanup = () => {}

    void import('leaflet').then((leaflet) => {
      if (cancelled || !containerRef.current) return
      const L = leaflet.default

      const base = 'https://unpkg.com/leaflet@1.9.4/dist/images'
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: `${base}/marker-icon-2x.png`,
        iconUrl: `${base}/marker-icon.png`,
        shadowUrl: `${base}/marker-shadow.png`,
      })

      const start: [number, number] = [
        defaultLatitude ?? DEFAULT_LATITUDE,
        defaultLongitude ?? DEFAULT_LONGITUDE,
      ]

      const map = L.map(container).setView(start, 14)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map)

      const marker = L.marker(start, { draggable: true }).addTo(map)

      marker.on('dragend', () => {
        const { lat, lng } = marker.getLatLng()
        setLatitude(lat.toFixed(7))
        setLongitude(lng.toFixed(7))
      })

      map.on('click', (event) => {
        marker.setLatLng(event.latlng)
        setLatitude(event.latlng.lat.toFixed(7))
        setLongitude(event.latlng.lng.toFixed(7))
      })

      mapRef.current = map
      markerRef.current = marker

      // Leaflet mesure mal son conteneur quand la carte est montée juste après le rendu.
      const timer = setTimeout(() => map.invalidateSize(), 200)

      cleanup = () => {
        clearTimeout(timer)
        map.remove()
        mapRef.current = null
        markerRef.current = null
      }
    })

    return () => {
      cancelled = true
      cleanup()
    }
  }, [defaultLatitude, defaultLongitude])

  /** Saisie manuelle : replace le marqueur et recentre la carte. */
  function syncMapFromInputs(nextLat: string, nextLng: string) {
    const lat = Number.parseFloat(nextLat)
    const lng = Number.parseFloat(nextLng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return

    markerRef.current?.setLatLng([lat, lng])
    mapRef.current?.setView([lat, lng], mapRef.current.getZoom())
  }

  function locateMe() {
    if (!navigator.geolocation) {
      setGeolocationError('Géolocalisation non supportée par ce navigateur.')
      return
    }
    // La géolocalisation est réservée aux contextes sécurisés (HTTPS ou localhost).
    if (!window.isSecureContext) {
      setGeolocationError(
        'La géolocalisation exige une connexion sécurisée (HTTPS). Vous pouvez toujours cliquer sur la carte ou saisir les coordonnées.',
      )
      return
    }
    setGeolocationError(null)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        setLatitude(lat.toFixed(7))
        setLongitude(lng.toFixed(7))
        markerRef.current?.setLatLng([lat, lng])
        mapRef.current?.setView([lat, lng], 16)
      },
      (error) =>
        setGeolocationError(
          error.code === error.PERMISSION_DENIED
            ? 'Accès à votre position refusé. Autorisez la localisation dans votre navigateur.'
            : 'Impossible de récupérer votre position.',
        ),
    )
  }

  return (
    <div>
      <span className="text-sm font-medium text-muted-foreground">
        Emplacement exact — cliquez sur la carte, ou saisissez les coordonnées directement
      </span>

      <div className="mt-2 grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="latitude" className="text-xs text-muted-foreground">
            Latitude
          </label>
          <input
            id="latitude"
            name="latitude"
            type="number"
            step="any"
            min={-90}
            max={90}
            value={latitude}
            onChange={(event) => setLatitude(event.target.value)}
            onBlur={(event) => syncMapFromInputs(event.target.value, longitude)}
            className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          />
          <FieldError messages={errors?.latitude} />
        </div>
        <div>
          <label htmlFor="longitude" className="text-xs text-muted-foreground">
            Longitude
          </label>
          <input
            id="longitude"
            name="longitude"
            type="number"
            step="any"
            min={-180}
            max={180}
            value={longitude}
            onChange={(event) => setLongitude(event.target.value)}
            onBlur={(event) => syncMapFromInputs(latitude, event.target.value)}
            className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          />
          <FieldError messages={errors?.longitude} />
        </div>
      </div>

      <button
        type="button"
        onClick={locateMe}
        className="mt-3 text-sm font-medium text-primary underline underline-offset-2"
      >
        Utiliser ma position actuelle
      </button>
      {geolocationError && <p className="mt-1 text-xs text-destructive">{geolocationError}</p>}

      {/* La carte ferme le bloc : les coordonnées se saisissent au-dessus, et
          cliquer sur la carte les met à jour. */}
      <div
        ref={containerRef}
        className="mt-3 h-72 w-full overflow-hidden rounded-xl border border-border"
      />
    </div>
  )
}
