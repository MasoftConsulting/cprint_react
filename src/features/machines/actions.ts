'use server'

import { redirect } from 'next/navigation'
import { updateTag } from 'next/cache'
import { z } from 'zod'

import { requireUser } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { type FormState } from '@/lib/form-state'
import { OPTIONS_MIGRATION_005, parseMachine } from '@/features/machines/schema'
import { PRINT_POINTS_TAG } from '@/features/print-points/queries'

/** Code d'erreur Postgres pour une violation de contrainte d'unicité. */
const UNIQUE_VIOLATION = '23505'

const DUPLICATE_SERIAL = {
  serial_number: ['Une machine avec ce numéro de série existe déjà.'],
}

const parse = parseMachine

/**
 * Écrit une machine ; si la base n'a pas encore les colonnes des options
 * (migration 005 non lancée), réécrit sans elles.
 *
 * Supabase répond alors PGRST204 (« Could not find the 'photocopie' column »)
 * — relevé sur la vraie base. Refuser tout l'enregistrement pour deux cases à
 * cocher bloquerait la gestion du parc ; les taire ferait croire qu'elles sont
 * enregistrées. On enregistre le reste, et on le dit.
 */
async function ecrire<T extends Record<string, unknown>>(
  donnees: T,
  operation: (valeurs: Partial<T>) => PromiseLike<{ error: { code?: string; message?: string } | null }>,
) {
  const premier = await operation(donnees)
  const absente =
    premier.error?.code === 'PGRST204' && /photocopie|scan/.test(premier.error.message ?? '')
  if (!absente) return { error: premier.error, sansOptions: false }

  const sansOptions = { ...donnees }
  for (const colonne of OPTIONS_MIGRATION_005) delete sansOptions[colonne]
  const second = await operation(sansOptions)
  return { error: second.error, sansOptions: true }
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
  const { error, sansOptions } = await ecrire(parsed.data, (valeurs) =>
    supabase.from('machine').insert(valeurs),
  )

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return { status: 'error', errors: DUPLICATE_SERIAL }
    }
    return { status: 'error', message: "Impossible d'enregistrer cette machine." }
  }

  // Le compteur de machines par site est lu par la page publique.
  updateTag(PRINT_POINTS_TAG)
  // `redirect` fonctionne par exception : il doit rester hors d'un bloc try.
  redirect(`/admin/machines?flash=${sansOptions ? 'created-sans-options' : 'created'}`)
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
  const { error, sansOptions } = await ecrire(parsed.data, (valeurs) =>
    supabase.from('machine').update(valeurs).eq('id_machine', idMachine),
  )

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return { status: 'error', errors: DUPLICATE_SERIAL }
    }
    return { status: 'error', message: 'Impossible de mettre à jour cette machine.' }
  }

  updateTag(PRINT_POINTS_TAG)
  redirect(`/admin/machines?flash=${sansOptions ? 'updated-sans-options' : 'updated'}`)
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
