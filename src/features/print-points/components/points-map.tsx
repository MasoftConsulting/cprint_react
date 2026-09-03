'use client'

import { useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'

type MapPoint = {
  id_site: number
  site_name: string
  address: string
  latitude: number
  longitude: number
}

/**
 * Carte des sites d'impression (Leaflet + tuiles OpenStreetMap).
 * Leaflet touche directement au DOM : il est chargé à la volée côté navigateur.
 */
export function PointsMap({ points }: { points: MapPoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container || points.length === 0) return

    let cleanup = () => {}
    let cancelled = false

    void import('leaflet').then((leaflet) => {
      if (cancelled || !containerRef.current) return
      const L = leaflet.default

      applyDefaultMarkerIcons(L)

      const map = L.map(container)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map)

      const bounds: [number, number][] = []
      for (const point of points) {
        L.marker([point.latitude, point.longitude])
          .addTo(map)
          .bindPopup(
            `<strong>${escapeHtml(point.site_name)}</strong><br>${escapeHtml(point.address)}`,
          )
        bounds.push([point.latitude, point.longitude])
      }

      if (bounds.length === 1) {
        map.setView(bounds[0], 15)
      } else {
        map.fitBounds(bounds, { padding: [30, 30] })
      }

      cleanup = () => map.remove()
    })

    return () => {
      cancelled = true
      cleanup()
    }
  }, [points])

  if (points.length === 0) return null

  return (
    <div
      ref={containerRef}
      className="mt-8 h-96 w-full overflow-hidden rounded-2xl border border-border"
    />
  )
}

/** Les icônes par défaut de Leaflet pointent vers des chemins relatifs cassés par le bundler. */
function applyDefaultMarkerIcons(L: typeof import('leaflet')) {
  const base = 'https://unpkg.com/leaflet@1.9.4/dist/images'
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: `${base}/marker-icon-2x.png`,
    iconUrl: `${base}/marker-icon.png`,
    shadowUrl: `${base}/marker-shadow.png`,
  })
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
