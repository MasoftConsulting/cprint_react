import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { MachineFonction, MachineType } from '@/features/machines/schema'

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
}

/** Une machine et les sites auxquels elle est affectée. */
export type MachineWithSites = Machine & {
  sites: { id_site: number; site_name: string }[]
}

const COLUMNS =
  'id_machine, serial_number, machine_name, mac_address, ip_address, type, fonction, date_acquisition, date_mise_service, actif'

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
  }
}

/**
 * Parc complet avec les sites d'affectation.
 * Aucune mise en cache : la table `machine` n'est lisible que par un compte
 * authentifié, donc la lecture dépend de la session (cookies).
 */
export async function getMachines(): Promise<MachineWithSites[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('machine')
    .select(`${COLUMNS}, affectation ( print_points ( id_site, site_name ) )`)
    .order('actif', { ascending: false })
    .order('serial_number', { ascending: true })

  if (error || !data) return []

  return data.map((row) => {
    const record = row as Record<string, unknown>
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

  const { data, error } = await supabase
    .from('machine')
    .select(`${COLUMNS}, affectation ( print_points ( id_site, site_name ) )`)
    .eq('id_machine', idMachine)
    .maybeSingle()

  if (error || !data) return null

  const record = data as Record<string, unknown>
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
