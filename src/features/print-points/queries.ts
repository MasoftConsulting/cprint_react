import 'server-only'

import { cacheLife, cacheTag } from 'next/cache'

import { createAnonClient } from '@/lib/supabase/anon'
import { logQueryError } from '@/lib/query-error'

export const PRINT_POINTS_TAG = 'print-points'

export type PrintPoint = {
  id_site: number
  site_name: string
  site_address: string | null
  city: string | null
  country: string
  latitude: number | null
  longitude: number | null
  actif: boolean
}

/** Un site enrichi du nombre de machines actives qui y sont affectées. */
export type PrintPointWithMachines = PrintPoint & {
  machinesActives: number
}

const COLUMNS =
  'id_site, site_name, site_address, city, country, latitude, longitude, actif'

function normalize(row: Record<string, unknown>): PrintPoint {
  return {
    id_site: Number(row.id_site),
    site_name: String(row.site_name),
    site_address: row.site_address === null || row.site_address === undefined ? null : String(row.site_address),
    city: row.city === null || row.city === undefined ? null : String(row.city),
    country: String(row.country ?? ''),
    // Postgres renvoie les `numeric` en chaîne pour préserver la précision.
    latitude: row.latitude === null || row.latitude === undefined ? null : Number(row.latitude),
    longitude: row.longitude === null || row.longitude === undefined ? null : Number(row.longitude),
    actif: row.actif === true,
  }
}

/** Sites d'impression, actifs d'abord puis par ordre alphabétique. */
export async function getPrintPoints(): Promise<PrintPoint[]> {
  'use cache'
  cacheTag(PRINT_POINTS_TAG)
  cacheLife('max')

  const supabase = createAnonClient()
  const { data, error } = await supabase
    .from('print_points')
    .select(COLUMNS)
    .order('actif', { ascending: false })
    .order('site_name', { ascending: true })

  if (error || !data) {
    logQueryError('lecture des sites', error)
    return []
  }
  return data.map((row) => normalize(row as Record<string, unknown>))
}

/**
 * Sites + nombre de machines actives, pour la page publique.
 * Le compteur passe par la vue `site_machine_counts` : la table `machine`
 * elle-même n'est pas lisible publiquement.
 */
export async function getPrintPointsWithMachines(): Promise<PrintPointWithMachines[]> {
  'use cache'
  cacheTag(PRINT_POINTS_TAG)
  cacheLife('max')

  const supabase = createAnonClient()
  const [sites, counts] = await Promise.all([
    supabase
      .from('print_points')
      .select(COLUMNS)
      .order('actif', { ascending: false })
      .order('site_name', { ascending: true }),
    supabase.from('site_machine_counts').select('id_site, machines_actives'),
  ])

  if (sites.error || !sites.data) {
    logQueryError('lecture des sites', sites.error)
    return []
  }
  logQueryError('lecture des compteurs de machines', counts.error)

  const byId = new Map<number, number>()
  for (const row of counts.data ?? []) {
    byId.set(Number(row.id_site), Number(row.machines_actives ?? 0))
  }

  return sites.data.map((row) => {
    const site = normalize(row as Record<string, unknown>)
    return { ...site, machinesActives: byId.get(site.id_site) ?? 0 }
  })
}

export async function getActivePrintPointsCount(): Promise<number> {
  'use cache'
  cacheTag(PRINT_POINTS_TAG)
  cacheLife('max')

  const supabase = createAnonClient()
  const { count } = await supabase
    .from('print_points')
    .select('id_site', { count: 'exact', head: true })
    .eq('actif', true)

  return count ?? 0
}

/** Lecture non mise en cache, pour les écrans d'administration. */
export async function findPrintPoint(idSite: number): Promise<PrintPoint | null> {
  const supabase = createAnonClient()
  const { data, error } = await supabase
    .from('print_points')
    .select(COLUMNS)
    .eq('id_site', idSite)
    .maybeSingle()

  if (error) logQueryError('lecture d’un site', error)
  if (error || !data) return null
  return normalize(data as Record<string, unknown>)
}

export function hasCoordinates(point: PrintPoint): boolean {
  return point.latitude !== null && point.longitude !== null
}
