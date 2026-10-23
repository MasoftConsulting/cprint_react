import { z } from 'zod'

/**
 * Un prix en euros : vide (zone non tarifée), ou un montant au centime près.
 * La virgule est acceptée — c'est elle qu'on tape en France.
 */
const prixEuro = z.preprocess(
  (valeur) => (typeof valeur === 'string' ? valeur.trim().replace(',', '.') : valeur ?? ''),
  z
    .string()
    .regex(/^$|^\d{1,3}(\.\d{1,2})?$/, 'Indiquez un montant en euros, au centime près (ex : 0,10).'),
)

/**
 * Tarifs des deux zones.
 *
 * - Zone F CFA (Togo et UEMOA) : en F CFA entiers.
 * - Zone euro (France…) : en euros. Laissés vides, la zone euro est facturée
 *   aux prix de la zone F CFA — c'est la règle de la centrale.
 *
 * C'est le **lieu d'impression** qui fixe la zone, pas la devise affichée.
 */
export const pricingSchema = z
  .object({
    price_nb: z.coerce.number().int().min(0, 'Indiquez un entier positif.'),
    price_couleur: z.coerce.number().int().min(0, 'Indiquez un entier positif.'),
    // Supplément facturé **par exemplaire relié**, et non par page : une piqûre
    // à cheval coûte la même chose sur huit pages que sur quarante. Zéro = la
    // reliure est offerte.
    price_livret: z.coerce.number().int().min(0, 'Indiquez un entier positif.'),
    price_nb_eur: prixEuro,
    price_couleur_eur: prixEuro,
    price_livret_eur: prixEuro,
  })
  .superRefine((tarifs, ctx) => {
    // Les deux prix par page, ou aucun : la centrale ignore une demi-grille,
    // qui ferait payer la couleur en euros et le noir au tarif togolais.
    const nb = tarifs.price_nb_eur !== ''
    const couleur = tarifs.price_couleur_eur !== ''
    if (nb !== couleur) {
      ctx.addIssue({
        code: 'custom',
        path: [nb ? 'price_couleur_eur' : 'price_nb_eur'],
        message: 'Renseignez les deux prix de la zone euro, ou aucun.',
      })
    }
  })

/** Lit le formulaire des tarifs d'après le schéma : aucun champ ne peut être oublié. */
export function parsePricing(formData: FormData) {
  const champs = Object.keys(pricingSchema.shape) as (keyof PricingInput)[]
  return pricingSchema.safeParse(
    Object.fromEntries(champs.map((champ) => [champ, formData.get(champ)])),
  )
}

/** Paramètres généraux du site (coordonnées, recharges, stats du hero). */
export const siteSettingsSchema = z.object({
  contact_phone: z.string().trim().min(1, 'Champ obligatoire.').max(30),
  contact_email: z.email('Adresse e-mail invalide.').max(255),
  contact_address: z.string().trim().min(1, 'Champ obligatoire.').max(255),
  // Facultative : vide, les alertes partent vers `contact_email`.
  notification_email: z.union([z.literal(''), z.email('Adresse e-mail invalide.').max(255)]),
  recharge_amounts: z
    .string()
    .trim()
    .regex(
      /^\d+(,\d+)*$/,
      'Indiquez des montants entiers séparés par des virgules (ex: 500,1000,2000,5000).',
    ),
  // Paliers de la zone euro, EN EUROS. Vide : les visiteurs qui lisent l'euro
  // voient les paliers F CFA convertis.
  recharge_amounts_eur: z.preprocess(
    (valeur) => (typeof valeur === 'string' ? valeur.replace(/\s+/g, '') : valeur ?? ''),
    z
      .string()
      .regex(/^$|^\d+(,\d+)*$/, 'Indiquez des montants entiers en euros, séparés par des virgules (ex : 5,10,20,50).'),
  ),
  avg_print_time: z.string().trim().min(1, 'Champ obligatoire.').max(20),
  payment_methods_count: z.coerce.number().int().min(0, 'Indiquez un entier positif.'),
})

export type PricingInput = z.infer<typeof pricingSchema>
export type SiteSettingsInput = z.infer<typeof siteSettingsSchema>

/** Lit le formulaire des paramètres d'après le schéma : aucun champ ne peut être oublié. */
export function parseSiteSettings(formData: FormData) {
  const champs = Object.keys(siteSettingsSchema.shape) as (keyof SiteSettingsInput)[]
  return siteSettingsSchema.safeParse(
    Object.fromEntries(champs.map((champ) => [champ, formData.get(champ)])),
  )
}
