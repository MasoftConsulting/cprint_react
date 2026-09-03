'use server'

import { redirect } from 'next/navigation'
import { updateTag } from 'next/cache'
import { z } from 'zod'

import { requireUser } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { type FormState } from '@/lib/form-state'
import { printPointSchema } from '@/features/print-points/schema'
import { PRINT_POINTS_TAG } from '@/features/print-points/queries'

/** Code d'erreur Postgres pour une violation de contrainte d'unicité. */
const UNIQUE_VIOLATION = '23505'

function parse(formData: FormData) {
  return printPointSchema.safeParse({
    site_name: formData.get('site_name'),
    site_address: formData.get('site_address'),
    city: formData.get('city'),
    country: formData.get('country'),
    latitude: formData.get('latitude'),
    longitude: formData.get('longitude'),
    actif: formData.get('actif'),
  })
}

const DUPLICATE_NAME = { site_name: ['Un site avec ce nom existe déjà.'] }

export async function createPrintPoint(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser()

  const parsed = parse(formData)
  if (!parsed.success) {
    return { status: 'error', errors: z.flattenError(parsed.error).fieldErrors }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('print_points').insert(parsed.data)

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return { status: 'error', errors: DUPLICATE_NAME }
    }
    return { status: 'error', message: "Impossible d'enregistrer ce site." }
  }

  updateTag(PRINT_POINTS_TAG)
  // `redirect` fonctionne par exception : il doit rester hors d'un bloc try.
  redirect('/admin/points?flash=created')
}

export async function updatePrintPoint(
  idSite: number,
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
    .from('print_points')
    .update(parsed.data)
    .eq('id_site', idSite)

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return { status: 'error', errors: DUPLICATE_NAME }
    }
    return { status: 'error', message: 'Impossible de mettre à jour ce site.' }
  }

  updateTag(PRINT_POINTS_TAG)
  redirect('/admin/points?flash=updated')
}

export async function deletePrintPoint(formData: FormData): Promise<void> {
  await requireUser()

  const idSite = Number(formData.get('id_site'))
  if (!Number.isInteger(idSite)) return

  const supabase = await createClient()
  // Les affectations liées partent en cascade (contrainte de clé étrangère).
  await supabase.from('print_points').delete().eq('id_site', idSite)

  updateTag(PRINT_POINTS_TAG)
  redirect('/admin/points?flash=deleted')
}
