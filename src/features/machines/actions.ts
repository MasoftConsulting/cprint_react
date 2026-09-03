'use server'

import { redirect } from 'next/navigation'
import { updateTag } from 'next/cache'
import { z } from 'zod'

import { requireUser } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { type FormState } from '@/lib/form-state'
import { machineSchema } from '@/features/machines/schema'
import { PRINT_POINTS_TAG } from '@/features/print-points/queries'

/** Code d'erreur Postgres pour une violation de contrainte d'unicité. */
const UNIQUE_VIOLATION = '23505'

const DUPLICATE_SERIAL = {
  serial_number: ['Une machine avec ce numéro de série existe déjà.'],
}

function parse(formData: FormData) {
  return machineSchema.safeParse({
    serial_number: formData.get('serial_number'),
    machine_name: formData.get('machine_name'),
    mac_address: formData.get('mac_address'),
    ip_address: formData.get('ip_address'),
    date_acquisition: formData.get('date_acquisition'),
    date_mise_service: formData.get('date_mise_service'),
    actif: formData.get('actif'),
    // Plusieurs cases à cocher partagent le nom `sites`.
    sites: formData.getAll('sites'),
  })
}

/**
 * Remplace les affectations d'une machine par la liste fournie.
 * On supprime puis on réinsère : la table ne porte aucune donnée propre,
 * et cela évite de calculer un différentiel pour deux ou trois lignes.
 */
async function replaceAffectations(idMachine: number, siteIds: number[]) {
  const supabase = await createClient()

  const { error: deleteError } = await supabase
    .from('affectation')
    .delete()
    .eq('id_machine', idMachine)

  if (deleteError) return deleteError

  if (siteIds.length === 0) return null

  const rows = [...new Set(siteIds)].map((idSite) => ({
    id_machine: idMachine,
    id_site: idSite,
  }))

  const { error: insertError } = await supabase.from('affectation').insert(rows)
  return insertError
}

export async function createMachine(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser()

  const parsed = parse(formData)
  if (!parsed.success) {
    return { status: 'error', errors: z.flattenError(parsed.error).fieldErrors }
  }

  const { sites, ...machine } = parsed.data
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('machine')
    .insert(machine)
    .select('id_machine')
    .single()

  if (error || !data) {
    if (error?.code === UNIQUE_VIOLATION) {
      return { status: 'error', errors: DUPLICATE_SERIAL }
    }
    return { status: 'error', message: "Impossible d'enregistrer cette machine." }
  }

  const affectationError = await replaceAffectations(Number(data.id_machine), sites)
  if (affectationError) {
    return {
      status: 'error',
      message: 'Machine enregistrée, mais les affectations ont échoué.',
    }
  }

  // Le compteur de machines par site est lu par la page publique.
  updateTag(PRINT_POINTS_TAG)
  // `redirect` fonctionne par exception : il doit rester hors d'un bloc try.
  redirect('/admin/machines?flash=created')
}

export async function updateMachine(
  idMachine: number,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser()

  const parsed = parse(formData)
  if (!parsed.success) {
    return { status: 'error', errors: z.flattenError(parsed.error).fieldErrors }
  }

  const { sites, ...machine } = parsed.data
  const supabase = await createClient()

  const { error } = await supabase
    .from('machine')
    .update(machine)
    .eq('id_machine', idMachine)

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return { status: 'error', errors: DUPLICATE_SERIAL }
    }
    return { status: 'error', message: 'Impossible de mettre à jour cette machine.' }
  }

  const affectationError = await replaceAffectations(idMachine, sites)
  if (affectationError) {
    return {
      status: 'error',
      message: 'Machine mise à jour, mais les affectations ont échoué.',
    }
  }

  updateTag(PRINT_POINTS_TAG)
  redirect('/admin/machines?flash=updated')
}

export async function deleteMachine(formData: FormData): Promise<void> {
  await requireUser()

  const idMachine = Number(formData.get('id_machine'))
  if (!Number.isInteger(idMachine)) return

  const supabase = await createClient()
  // Les affectations liées partent en cascade (contrainte de clé étrangère).
  await supabase.from('machine').delete().eq('id_machine', idMachine)

  updateTag(PRINT_POINTS_TAG)
  redirect('/admin/machines?flash=deleted')
}
