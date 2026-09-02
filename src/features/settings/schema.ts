import { z } from 'zod'

/** Tarifs affichés sur la page publique et dans le simulateur. */
export const pricingSchema = z.object({
  price_nb: z.coerce.number().int().min(0, 'Indiquez un entier positif.'),
  price_couleur: z.coerce.number().int().min(0, 'Indiquez un entier positif.'),
})

/** Paramètres généraux du site (coordonnées, recharges, stats du hero). */
export const siteSettingsSchema = z.object({
  contact_phone: z.string().trim().min(1, 'Champ obligatoire.').max(30),
  contact_email: z.email('Adresse e-mail invalide.').max(255),
  contact_address: z.string().trim().min(1, 'Champ obligatoire.').max(255),
  recharge_amounts: z
    .string()
    .trim()
    .regex(
      /^\d+(,\d+)*$/,
      'Indiquez des montants entiers séparés par des virgules (ex: 500,1000,2000,5000).',
    ),
  avg_print_time: z.string().trim().min(1, 'Champ obligatoire.').max(20),
  payment_methods_count: z.coerce.number().int().min(0, 'Indiquez un entier positif.'),
})

export type PricingInput = z.infer<typeof pricingSchema>
export type SiteSettingsInput = z.infer<typeof siteSettingsSchema>
