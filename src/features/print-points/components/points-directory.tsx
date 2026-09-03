'use client'

import { useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { MapPin, Printer } from 'lucide-react'

import { cn } from '@/lib/cn'
import type { PrintPointWithMachines } from '@/features/print-points/queries'
import { formatSiteAddress, statusLabel } from '@/features/print-points/schema'

// Leaflet manipule `window` : il ne doit pas être rendu côté serveur.
const PointsMap = dynamic(
  () => import('@/features/print-points/components/points-map').then((mod) => mod.PointsMap),
  { ssr: false },
)

type Coords = { latitude: number; longitude: number }

/** Distance à vol d'oiseau (formule de Haversine) — aucun appel d'API. */
function haversineKm(from: Coords, to: Coords): number {
  const earthRadiusKm = 6371
  const toRad = (degrees: number) => (degrees * Math.PI) / 180
  const dLat = toRad(to.latitude - from.latitude)
  const dLon = toRad(to.longitude - from.longitude)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.latitude)) * Math.cos(toRad(to.latitude)) * Math.sin(dLon / 2) ** 2
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function PointsDirectory({ points }: { points: PrintPointWithMachines[] }) {
  const [position, setPosition] = useState<Coords | null>(null)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mapPoints = useMemo(
    () =>
      points
        .filter((point) => point.latitude !== null && point.longitude !== null)
        .map((point) => ({
          id_site: point.id_site,
          site_name: point.site_name,
          address: formatSiteAddress(point),
          latitude: point.latitude as number,
          longitude: point.longitude as number,
        })),
    [points],
  )

  // Les sites sans coordonnées restent en fin de liste une fois l'utilisateur localisé.
  const orderedPoints = useMemo(() => {
    const withDistance = points.map((point) => ({
      point,
      distance:
        position && point.latitude !== null && point.longitude !== null
          ? haversineKm(position, { latitude: point.latitude, longitude: point.longitude })
          : null,
    }))

    if (!position) return withDistance

    return withDistance.sort(
      (a, b) => (a.distance ?? Number.POSITIVE_INFINITY) - (b.distance ?? Number.POSITIVE_INFINITY),
    )
  }, [points, position])

  function locate() {
    if (!navigator.geolocation) {
      setError('Géolocalisation non supportée par ce navigateur.')
      return
    }
    // Les navigateurs réservent la géolocalisation aux contextes sécurisés :
    // elle échoue sur une adresse http:// autre que localhost, d'où ce message
    // explicite plutôt qu'un « position introuvable » incompréhensible.
    if (!window.isSecureContext) {
      setError(
        'La géolocalisation exige une connexion sécurisée (HTTPS). Ouvrez le site en HTTPS ou depuis localhost.',
      )
      return
    }

    setLocating(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ latitude: pos.coords.latitude, longitude: pos.coords.longitude })
        setLocating(false)
        document.getElementById('points-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      },
      (geolocationError) => {
        setLocating(false)
        setError(
          geolocationError.code === geolocationError.PERMISSION_DENIED
            ? 'Accès à votre position refusé. Autorisez la localisation dans votre navigateur.'
            : 'Impossible de récupérer votre position.',
        )
      },
    )
  }

  return (
    <>
      <section className="bg-[image:var(--gradient-hero)] text-primary-foreground">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
          <span className="text-sm font-semibold opacity-90">Points Campus Print</span>
          <h1 className="mt-2 font-display text-3xl font-extrabold sm:text-5xl">
            Une borne sur votre campus
          </h1>
          <p className="mt-4 max-w-xl opacity-85">
            Nos points d&apos;impression sont installés là où les étudiants passent déjà :
            bibliothèque, foyer, accueil.
          </p>
          <button
            type="button"
            onClick={locate}
            disabled={locating}
            className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary-foreground/15 px-6 text-sm font-medium whitespace-nowrap text-primary-foreground hover:bg-primary-foreground/25 disabled:opacity-70"
          >
            {locating ? 'Localisation en cours…' : '📍 Trouver le point le plus proche de moi'}
          </button>
          {error && <p className="mt-2 text-sm text-primary-foreground/90">{error}</p>}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-4 sm:grid-cols-2" id="points-list">
          {orderedPoints.length === 0 && (
            <p className="col-span-2 text-center text-muted-foreground">
              Aucun point d&apos;impression disponible pour le moment.
            </p>
          )}

          {orderedPoints.map(({ point, distance }) => (
            <div key={point.id_site} className="surface-card p-6">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-display text-lg font-bold">{point.site_name}</h2>
                <span
                  className={cn(
                    'shrink-0 rounded-full px-3 py-1 text-xs font-semibold',
                    point.actif
                      ? 'bg-success/10 text-success'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {statusLabel(point.actif)}
                </span>
              </div>
              <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                {formatSiteAddress(point)}
              </p>
              <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                <Printer className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                {point.machinesActives === 0
                  ? 'Aucune machine installée'
                  : `${point.machinesActives} machine${point.machinesActives > 1 ? 's' : ''} disponible${point.machinesActives > 1 ? 's' : ''}`}
              </p>

              {distance !== null && (
                <p className="mt-2 text-sm font-semibold text-primary">
                  À environ {distance.toFixed(1)} km de vous
                </p>
              )}

              {point.latitude !== null && point.longitude !== null && (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${point.latitude},${point.longitude}`}
                  target="_blank"
                  rel="noopener"
                  className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  Itinéraire →
                </a>
              )}
            </div>
          ))}
        </div>

        <PointsMap points={mapPoints} />
      </section>
    </>
  )
}
