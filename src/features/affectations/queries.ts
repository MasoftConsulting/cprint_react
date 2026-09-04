import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { logQueryError } from '@/lib/query-error'

export type AvailableMachine = {
  id_machine: number
  serial_number: string
  machine_name: string | null
  actif: boolean
}

export type SiteAssignment = {
  id_site: number
  site_name: string
  machines: {
    id_affectation: number
    id_machine: number
    serial_number: string
    machine_name: string | null
    actif: boolean
  }[]
}

/**
 * Machines encore libres : une machine déjà affectée n'est plus disponible.
 * PostgREST ne sait pas exprimer « pas de ligne liée », on filtre donc les
 * identifiants déjà présents dans `affectation` côté application — le parc
 * se compte en dizaines, la liste tient largement en mémoire.
 */
export async function getAvailableMachines(): Promise<AvailableMachine[]> {
  const supabase = await createClient()

  const [machines, affectations] = await Promise.all([
    supabase
      .from('machine')
      .select('id_machine, serial_number, machine_name, actif')
      .order('serial_number', { ascending: true }),
    supabase.from('affectation').select('id_machine'),
  ])

  if (machines.error || !machines.data) {
    logQueryError('lecture des machines disponibles', machines.error)
    return []
  }
  logQueryError('lecture des affectations', affectations.error)

  const assigned = new Set((affectations.data ?? []).map((row) => Number(row.id_machine)))

  return machines.data
    .filter((row) => !assigned.has(Number(row.id_machine)))
    .map((row) => ({
      id_machine: Number(row.id_machine),
      serial_number: String(row.serial_number),
      machine_name: row.machine_name === null ? null : String(row.machine_name),
      actif: row.actif === true,
    }))
}

/** Sites et machines qui y sont installées. */
export async function getSiteAssignments(): Promise<SiteAssignment[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('print_points')
    .select(
      'id_site, site_name, affectation ( id_affectation, machine ( id_machine, serial_number, machine_name, actif ) )',
    )
    .order('site_name', { ascending: true })

  if (error || !data) {
    logQueryError('lecture des affectations par site', error)
    return []
  }

  return data.map((row) => {
    const record = row as Record<string, unknown>
    const affectations = (record.affectation ?? []) as {
      id_affectation: number
      machine: {
        id_machine: number
        serial_number: string
        machine_name: string | null
        actif: boolean
      } | null
    }[]

    return {
      id_site: Number(record.id_site),
      site_name: String(record.site_name),
      machines: affectations
        .filter((a) => a.machine !== null)
        .map((a) => ({
          id_affectation: Number(a.id_affectation),
          id_machine: Number(a.machine!.id_machine),
          serial_number: String(a.machine!.serial_number),
          machine_name: a.machine!.machine_name === null ? null : String(a.machine!.machine_name),
          actif: a.machine!.actif === true,
        })),
    }
  })
}
