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
    type: formData.get('type'),
    fonction: formData.get('fonction'),
    date_acquisition: formData.get('date_acquisition'),
    date_mise_service: formData.get('date_mise_service'),
    actif: formData.get('actif'),
  })
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

  const supabase = await createClient()
  const { error } = await supabase.from('machine').insert(parsed.data)

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return { status: 'error', errors: DUPLICATE_SERIAL }
    }
    return { status: 'error', message: "Impossible d'enregistrer cette machine." }
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

  const supabase = await createClient()
  const { error } = await supabase
    .from('machine')
    .update(parsed.data)
    .eq('id_machine', idMachine)

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return { status: 'error', errors: DUPLICATE_SERIAL }
    }
    return { status: 'error', message: 'Impossible de mettre à jour cette machine.' }
  }

  updateTag(PRINT_POINTS_TAG)
  redirect('/admin/machines?flash=updated')
}

export async function deleteMachine(formData: FormData): Promise<void> {
  await requireUser()

  const idMachine = Number(formData.get('id_machine'))
  if (!Number.isInteger(idMachine)) return

  const supabase = await createClient()
  // L'affectation liée part en cascade (contrainte de clé étrangère).
  await supabase.from('machine').delete().eq('id_machine', idMachine)

  updateTag(PRINT_POINTS_TAG)
  redirect('/admin/machines?flash=deleted')
}
