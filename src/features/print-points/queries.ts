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
  /**
   * Nom du point d'impression dans la centrale (`agents.name`).
   *
   * C'est ce qui relie un site commercial à la machine qui imprime, et donc
   * la seule façon de dire si la borne répond *maintenant*. `null` tant que
   * personne n'a fait le rapprochement : la page affiche alors le site sans
   * état, plutôt qu'un état inventé.
   */
  agent_name: string | null
}

/** Un site enrichi du nombre de machines actives qui y sont affectées. */
export type PrintPointWithMachines = PrintPoint & {
  machinesActives: number
}

const COLUMNS =
  'id_site, site_name, site_address, city, country, latitude, longitude, actif, agent_name'

/**
 * Repli si la colonne `agent_name` n'existe pas encore en base.
 *
 * Elle s'ajoute par une migration d'une ligne, et le site ne doit pas tomber
 * entre le déploiement du code et cette migration — une page de points vide
 * serait bien pire que des points sans état.
 */
const COLUMNS_SANS_AGENT =
  'id_site, site_name, site_address, city, country, latitude, longitude, actif'

function colonneAbsente(error: { message?: string } | null): boolean {
  return Boolean(error?.message?.includes('agent_name'))
}

/**
 * Lit les sites, en retombant sur la liste de colonnes d'avant la migration
 * si `agent_name` n'existe pas encore.
 *
 * Les lignes sont rendues en `Record<string, unknown>` : le client Supabase
 * déduit son type de la chaîne de `select`, et les deux chemins donneraient
 * sinon deux types incompatibles pour la même donnée.
 */
async function lireSites(): Promise<Record<string, unknown>[] | null> {
  const supabase = createAnonClient()
  const requete = (colonnes: string) =>
    supabase
      .from('print_points')
      .select(colonnes)
      .order('actif', { ascending: false })
      .order('site_name', { ascending: true })

  let { data, error } = await requete(COLUMNS)
  if (error && colonneAbsente(error)) {
    ;({ data, error } = await requete(COLUMNS_SANS_AGENT))
  }
  if (error || !data) {
    logQueryError('lecture des sites', error)
    return null
  }
  return data as unknown as Record<string, unknown>[]
}

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
    agent_name:
      row.agent_name === null || row.agent_name === undefined
        ? null
        : String(row.agent_name) || null,
  }
}

/** Sites d'impression, actifs d'abord puis par ordre alphabétique. */
export async function getPrintPoints(): Promise<PrintPoint[]> {
  'use cache'
  cacheTag(PRINT_POINTS_TAG)
  cacheLife('max')

  const data = await lireSites()
  return data ? data.map(normalize) : []
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
    lireSites(),
    supabase.from('site_machine_counts').select('id_site, machines_actives'),
  ])

  if (!sites) return []
  logQueryError('lecture des compteurs de machines', counts.error)

  const byId = new Map<number, number>()
  for (const row of counts.data ?? []) {
    byId.set(Number(row.id_site), Number(row.machines_actives ?? 0))
  }

  return sites.map((row) => {
    const site = normalize(row)
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

/**
 * Lecture non mise en cache, pour les écrans d'administration.
 *
 * Même repli que `lireSites` sur l'absence de `agent_name` — et ce n'est pas
 * une précaution théorique : sans lui, la requête échouait, cette fonction
 * rendait `null`, et la page d'édition d'un site répondait 404 pour **tous**
 * les sites tant que la migration n'était pas passée.
 */
export async function findPrintPoint(idSite: number): Promise<PrintPoint | null> {
  const supabase = createAnonClient()
  const requete = (colonnes: string) =>
    supabase.from('print_points').select(colonnes).eq('id_site', idSite).maybeSingle()

  let { data, error } = await requete(COLUMNS)
  if (error && colonneAbsente(error)) {
    ;({ data, error } = await requete(COLUMNS_SANS_AGENT))
  }

  if (error) logQueryError('lecture d’un site', error)
  if (error || !data) return null
  return normalize(data as unknown as Record<string, unknown>)
}

export function hasCoordinates(point: PrintPoint): boolean {
  return point.latitude !== null && point.longitude !== null
}

/**
 * Points d'impression déclarés dans la centrale, pour rattacher un site.
 *
 * Jamais bloquant : sans centrale configurée, ou si elle ne répond pas, le
 * formulaire retombe sur une saisie libre plutôt que de refuser d'enregistrer
 * un site.
 */
export async function getAgentsPourRattachement(): Promise<
  { name: string; printer_label: string | null }[]
> {
  const { getPrintAgents } = await import('@/features/impressions/queries')
  try {
    const agents = await getPrintAgents()
    return agents.map((agent) => ({
      name: agent.name,
      printer_label: agent.printer_label,
    }))
  } catch {
    return []
  }
}
