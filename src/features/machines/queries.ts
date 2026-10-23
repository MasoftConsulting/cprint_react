import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { MachineFonction, MachineType } from '@/features/machines/schema'
import { logQueryError } from '@/lib/query-error'

export const MACHINES_TAG = 'machines'

export type Machine = {
  id_machine: number
  serial_number: string
  machine_name: string | null
  mac_address: string | null
  ip_address: string | null
  type: MachineType
  fonction: MachineFonction
  date_acquisition: string | null
  date_mise_service: string | null
  actif: boolean
  /** Vraies tant que la migration 005 n'a pas créé les colonnes. */
  photocopie: boolean
  scan: boolean
}

/** Une machine et les sites auxquels elle est affectée. */
export type MachineWithSites = Machine & {
  sites: { id_site: number; site_name: string }[]
}

const COLUMNS_SANS_OPTIONS =
  'id_machine, serial_number, machine_name, mac_address, ip_address, type, fonction, date_acquisition, date_mise_service, actif'
const COLUMNS = `${COLUMNS_SANS_OPTIONS}, photocopie, scan`

/**
 * Colonne absente : la migration 005 n'est pas encore lancée. Supabase répond
 * alors 42703 (« column machine.photocopie does not exist ») — relevé sur la
 * vraie base, pas supposé. On relit sans les options plutôt que d'afficher un
 * parc vide : c'est ce qui avait rendu toutes les fiches de site introuvables
 * quand `agent_name` manquait.
 */
function optionsAbsentes(error: { code?: string; message?: string } | null): boolean {
  return Boolean(
    error && error.code === '42703' && /photocopie|scan/.test(error.message ?? ''),
  )
}

function normalize(row: Record<string, unknown>): Machine {
  const text = (value: unknown) => (value === null || value === undefined ? null : String(value))

  return {
    id_machine: Number(row.id_machine),
    serial_number: String(row.serial_number),
    machine_name: text(row.machine_name),
    mac_address: text(row.mac_address),
    ip_address: text(row.ip_address),
    type: row.type === 'A3' ? 'A3' : 'A4',
    fonction: row.fonction === 'couleur' ? 'couleur' : 'mono',
    date_acquisition: text(row.date_acquisition),
    date_mise_service: text(row.date_mise_service),
    actif: row.actif === true,
    photocopie: row.photocopie !== false,
    scan: row.scan !== false,
  }
}

/**
 * Parc complet avec les sites d'affectation.
 * Aucune mise en cache : la table `machine` n'est lisible que par un compte
 * authentifié, donc la lecture dépend de la session (cookies).
 */
export async function getMachines(): Promise<MachineWithSites[]> {
  const supabase = await createClient()

  const lire = (colonnes: string) =>
    supabase
      .from('machine')
      .select(`${colonnes}, affectation ( print_points ( id_site, site_name ) )`)
      .order('actif', { ascending: false })
      .order('serial_number', { ascending: true })
  let { data, error } = await lire(COLUMNS)
  if (optionsAbsentes(error)) ({ data, error } = await lire(COLUMNS_SANS_OPTIONS))

  if (error || !data) {
    logQueryError('lecture du parc de machines', error)
    return []
  }

  return data.map((row) => {
    const record = row as unknown as Record<string, unknown>
    const affectations = (record.affectation ?? []) as {
      print_points: { id_site: number; site_name: string } | null
    }[]

    return {
      ...normalize(record),
      sites: affectations
        .map((a) => a.print_points)
        .filter((site): site is { id_site: number; site_name: string } => site !== null),
    }
  })
}

export async function findMachine(idMachine: number): Promise<MachineWithSites | null> {
  const supabase = await createClient()

  const lire = (colonnes: string) =>
    supabase
      .from('machine')
      .select(`${colonnes}, affectation ( print_points ( id_site, site_name ) )`)
      .eq('id_machine', idMachine)
      .maybeSingle()
  let { data, error } = await lire(COLUMNS)
  if (optionsAbsentes(error)) ({ data, error } = await lire(COLUMNS_SANS_OPTIONS))

  if (error) logQueryError('lecture d’une machine', error)
  if (error || !data) return null

  const record = data as unknown as Record<string, unknown>
  const affectations = (record.affectation ?? []) as {
    print_points: { id_site: number; site_name: string } | null
  }[]

  return {
    ...normalize(record),
    sites: affectations
      .map((a) => a.print_points)
      .filter((site): site is { id_site: number; site_name: string } => site !== null),
  }
}

export async function getActiveMachinesCount(): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('machine')
    .select('id_machine', { count: 'exact', head: true })
    .eq('actif', true)

  return count ?? 0
}
