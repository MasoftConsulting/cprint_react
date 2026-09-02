'use server'

import { z } from 'zod'

import { type FormState } from '@/lib/form-state'

const contactSchema = z.object({
  name: z.string().trim().min(1, 'Champ obligatoire.').max(255),
  phone: z.string().trim().max(30).optional(),
  email: z.email('Adresse e-mail invalide.'),
  message: z.string().trim().min(1, 'Champ obligatoire.'),
})

export async function sendContactMessage(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = contactSchema.safeParse({
    name: formData.get('name'),
    phone: formData.get('phone') || undefined,
    email: formData.get('email'),
    message: formData.get('message'),
  })

  if (!parsed.success) {
    return { status: 'error', errors: z.flattenError(parsed.error).fieldErrors }
  }

  // Le projet Laravel se contente de valider puis d'afficher une confirmation :
  // l'envoi réel (e-mail ou stockage) reste à brancher ici.
  return {
    status: 'success',
    message: 'Votre message a bien été envoyé. Nous vous répondons sous 24 h.',
  }
}
