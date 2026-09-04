import { z } from 'zod'

/** Pages publiques qui affichent un bloc FAQ. */
export const faqPages = ['comment-ca-marche', 'tarifs'] as const
export type FaqPage = (typeof faqPages)[number]

export const FAQ_PAGE_LABELS: Record<FaqPage, string> = {
  'comment-ca-marche': 'Comment ça marche',
  tarifs: 'Tarifs',
}

export const faqSchema = z.object({
  page: z.enum(faqPages, { message: 'Choisissez une page.' }),
  question: z.string().trim().min(1, 'Champ obligatoire.').max(255),
  reponse: z.string().trim().min(1, 'Champ obligatoire.').max(2000),
  position: z.coerce.number().int().min(0).default(0),
  actif: z.preprocess((value) => value === 'on' || value === 'true' || value === true, z.boolean()),
})

export type FaqInput = z.infer<typeof faqSchema>
