import { z } from 'zod'

export const contactSchema = z.object({
  nom: z.string().trim().min(1, 'Champ obligatoire.').max(255),
  telephone: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
    z.string().trim().max(30).nullable(),
  ),
  email: z.email('Adresse e-mail invalide.').max(255),
  message: z.string().trim().min(1, 'Champ obligatoire.').max(5000),
})

export type ContactInput = z.infer<typeof contactSchema>
