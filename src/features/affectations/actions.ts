'use server'

import { redirect } from 'next/navigation'
import { updateTag } from 'next/cache'
import { z } from 'zod'

import { requireUser } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { type FormState } from '@/lib/form-state'
import { PRINT_POINTS_TAG } from '@/features/print-points/queries'

/** Code d'erreur Postgres pour une violation de contrainte d'unicité. */
const UNIQUE_VIOLATION = '23505'

const assignSchema = z.object({
  id_machine: z.coerce.number().int().positive('Choisissez une machine.'),
  id_site: z.coerce.number().int().positive('Choisissez un site.'),
})

export async function assignMachine(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser()

  const parsed = assignSchema.safeParse({
    id_machine: formData.get('id_machine'),
    id_site: formData.get('id_site'),
  })
  if (!parsed.success) {
    return { status: 'error', errors: z.flattenError(parsed.error).fieldErrors }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('affectation').insert(parsed.data)

  if (error) {
    // La contrainte d'unicité sur `id_machine` est le vrai garde-fou : deux
    // onglets ouverts en même temps ne peuvent pas affecter la même machine.
    if (error.code === UNIQUE_VIOLATION) {
      return {
        status: 'error',
        message: "Cette machine est déjà affectée à un site : elle n'est plus disponible.",
      }
    }
    return { status: 'error', message: "Impossible d'enregistrer cette affectation." }
  }

  // Le compteur de machines par site est lu par la page publique.
  updateTag(PRINT_POINTS_TAG)
  // `redirect` fonctionne par exception : il doit rester hors d'un bloc try.
  redirect('/admin/gestion?flash=assigned')
}

export async function unassignMachine(formData: FormData): Promise<void> {
  await requireUser()

  const idAffectation = Number(formData.get('id_affectation'))
  if (!Number.isInteger(idAffectation)) return

  const supabase = await createClient()
  await supabase.from('affectation').delete().eq('id_affectation', idAffectation)

  updateTag(PRINT_POINTS_TAG)
  redirect('/admin/gestion?flash=unassigned')
}
