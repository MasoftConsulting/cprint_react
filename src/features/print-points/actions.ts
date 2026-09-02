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
    name: formData.get('name'),
    location: formData.get('location'),
    hours: formData.get('hours'),
    status: formData.get('status'),
    latitude: formData.get('latitude'),
    longitude: formData.get('longitude'),
    position: formData.get('position') ?? 0,
  })
}

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
      return {
        status: 'error',
        errors: { name: ["Un point d'impression avec ce nom existe déjà."] },
      }
    }
    return { status: 'error', message: "Impossible d'enregistrer ce point d'impression." }
  }

  updateTag(PRINT_POINTS_TAG)
  // `redirect` fonctionne par exception : il doit rester hors d'un bloc try.
  redirect('/admin/points?flash=created')
}

export async function updatePrintPoint(
  id: number,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser()

  const parsed = parse(formData)
  if (!parsed.success) {
    return { status: 'error', errors: z.flattenError(parsed.error).fieldErrors }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('print_points').update(parsed.data).eq('id', id)

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return {
        status: 'error',
        errors: { name: ["Un point d'impression avec ce nom existe déjà."] },
      }
    }
    return { status: 'error', message: 'Impossible de mettre à jour ce point.' }
  }

  updateTag(PRINT_POINTS_TAG)
  redirect('/admin/points?flash=updated')
}

export async function deletePrintPoint(formData: FormData): Promise<void> {
  await requireUser()

  const id = Number(formData.get('id'))
  if (!Number.isInteger(id)) return

  const supabase = await createClient()
  await supabase.from('print_points').delete().eq('id', id)

  updateTag(PRINT_POINTS_TAG)
  redirect('/admin/points?flash=deleted')
}
