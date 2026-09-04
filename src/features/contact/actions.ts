'use server'

import { after } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { requireUser } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { type FormState } from '@/lib/form-state'
import { contactSchema } from '@/features/contact/schema'
import { notifyNewContactMessage } from '@/features/contact/notification'

export async function sendContactMessage(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = contactSchema.safeParse({
    nom: formData.get('nom'),
    telephone: formData.get('telephone'),
    email: formData.get('email'),
    message: formData.get('message'),
  })

  if (!parsed.success) {
    return { status: 'error', errors: z.flattenError(parsed.error).fieldErrors }
  }

  // Action publique : aucune session à exiger ici. La politique RLS n'autorise
  // `anon` qu'à insérer, jamais à relire les messages déjà déposés.
  const supabase = await createClient()
  const { error } = await supabase.from('contact_messages').insert(parsed.data)

  if (error) {
    return {
      status: 'error',
      message: "Votre message n'a pas pu être envoyé. Réessayez dans un instant.",
    }
  }

  // L'alerte part une fois la réponse rendue : le visiteur n'attend pas le
  // serveur SMTP, et un envoi raté ne remet pas en cause son message déjà stocké.
  after(() => notifyNewContactMessage(parsed.data))

  return {
    status: 'success',
    message: 'Votre message a bien été envoyé. Nous vous répondons sous 24 h.',
  }
}

// La boîte de réception n'est pas mise en cache : elle dépend de la session.
// `revalidatePath` suffit à rafraîchir la page après une action.
export async function markMessageRead(formData: FormData): Promise<void> {
  await requireUser()

  const idMessage = Number(formData.get('id_message'))
  if (!Number.isInteger(idMessage)) return

  const supabase = await createClient()
  await supabase
    .from('contact_messages')
    .update({ lu: formData.get('lu') === 'true' })
    .eq('id_message', idMessage)

  revalidatePath('/admin/messages')
}

export async function deleteContactMessage(formData: FormData): Promise<void> {
  await requireUser()

  const idMessage = Number(formData.get('id_message'))
  if (!Number.isInteger(idMessage)) return

  const supabase = await createClient()
  await supabase.from('contact_messages').delete().eq('id_message', idMessage)

  revalidatePath('/admin/messages')
}
