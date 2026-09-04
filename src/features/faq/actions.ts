'use server'

import { redirect } from 'next/navigation'
import { updateTag } from 'next/cache'
import { z } from 'zod'

import { requireUser } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { type FormState } from '@/lib/form-state'
import { faqSchema } from '@/features/faq/schema'
import { FAQ_TAG } from '@/features/faq/queries'

function parse(formData: FormData) {
  return faqSchema.safeParse({
    page: formData.get('page'),
    question: formData.get('question'),
    reponse: formData.get('reponse'),
    position: formData.get('position') ?? 0,
    actif: formData.get('actif'),
  })
}

export async function createFaq(_prevState: FormState, formData: FormData): Promise<FormState> {
  await requireUser()

  const parsed = parse(formData)
  if (!parsed.success) {
    return { status: 'error', errors: z.flattenError(parsed.error).fieldErrors }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('faq').insert(parsed.data)

  if (error) {
    return { status: 'error', message: "Impossible d'enregistrer cette question." }
  }

  updateTag(FAQ_TAG)
  // `redirect` fonctionne par exception : il doit rester hors d'un bloc try.
  redirect('/admin/faq?flash=created')
}

export async function updateFaq(
  idFaq: number,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser()

  const parsed = parse(formData)
  if (!parsed.success) {
    return { status: 'error', errors: z.flattenError(parsed.error).fieldErrors }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('faq').update(parsed.data).eq('id_faq', idFaq)

  if (error) {
    return { status: 'error', message: 'Impossible de mettre à jour cette question.' }
  }

  updateTag(FAQ_TAG)
  redirect('/admin/faq?flash=updated')
}

export async function deleteFaq(formData: FormData): Promise<void> {
  await requireUser()

  const idFaq = Number(formData.get('id_faq'))
  if (!Number.isInteger(idFaq)) return

  const supabase = await createClient()
  await supabase.from('faq').delete().eq('id_faq', idFaq)

  updateTag(FAQ_TAG)
  redirect('/admin/faq?flash=deleted')
}
