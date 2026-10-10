import { z } from 'zod'

/** Un code de retrait : six chiffres, ni plus ni moins. */
export const codeSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/\s/g, ''))
  .pipe(z.string().regex(/^\d{6}$/))

export const jobIdSchema = z.coerce.number().int().positive()

/**
 * Nom d'un point d'impression. Il voyage dans une URL et dans le fichier de
 * réglages de l'agent : on le tient à un alphabet sobre, sans espace ni
 * accent, comme « magasin » ou « campus-nord ».
 */
export const agentNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Deux caractères au minimum.')
    .max(40, 'Quarante caractères au maximum.')
    .regex(/^[a-z0-9][a-z0-9-]*$/, 'Minuscules, chiffres et tirets seulement (ex. campus-nord).'),
  printer_label: z.string().trim().max(60, 'Soixante caractères au maximum.').optional(),
  /**
   * IP de l'imprimante sur le réseau local du point. Facultative ici : elle
   * ne sert qu'à pré-remplir l'installeur, et la centrale ne la stocke pas —
   * c'est une adresse privée, qui n'a de sens que dans le magasin concerné.
   */
  printer_ip: z
    .string()
    .trim()
    .regex(/^(\d{1,3}\.){3}\d{1,3}$/, 'Quatre nombres séparés par des points (ex. 192.168.1.21).')
    .refine(
      (value) => value.split('.').every((bloc) => Number(bloc) <= 255),
      'Chaque nombre doit rester entre 0 et 255.',
    )
    .optional()
    .or(z.literal('')),
})

/**
 * Compte à crédit. Le solde est en pages noir & blanc : une page couleur en
 * consomme davantage, dans le rapport des tarifs. Le calcul est fait par la
 * centrale, jamais ici.
 */
export const creditAccountSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Adresse e-mail invalide.')
    .max(255, 'Deux cent cinquante-cinq caractères au maximum.'),
  label: z.string().trim().max(80, 'Quatre-vingts caractères au maximum.').optional(),
  pages: z.coerce
    .number()
    .int('Un nombre entier de pages.')
    .min(0, 'Pas de solde initial négatif.')
    .max(1_000_000, 'Un million de pages au maximum.')
    .optional(),
})

/**
 * Recharge. Un nombre négatif retire des pages : c'est une correction
 * comptable, volontairement permise, et la centrale l'accepte même si le solde
 * passe sous zéro.
 */
export const creditTopUpSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  pages: z.coerce
    .number()
    .int('Un nombre entier de pages.')
    .refine((n) => n !== 0, 'Indiquez un nombre de pages différent de zéro.')
    .min(-1_000_000)
    .max(1_000_000),
  note: z.string().trim().max(120, 'Cent vingt caractères au maximum.').optional(),
})

/**
 * Ajustement d'un portefeuille PrintPoint : geste commercial, ou recharge
 * encaissée en espèces au comptoir.
 *
 * Ce n'est pas une recharge en ligne — aucun paiement n'a eu lieu côté
 * FedaPay. La note est donc **obligatoire** ici, alors qu'elle est optionnelle
 * pour un crédit en pages : sans elle, de l'argent apparaîtrait de nulle part
 * dans l'historique le jour d'un contrôle. La centrale applique la même règle.
 */
export const walletAdjustSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  montant: z.coerce
    .number()
    .refine((n) => n !== 0, 'Indiquez un montant différent de zéro.')
    .min(-1_000_000, 'Un million au maximum.')
    .max(1_000_000, 'Un million au maximum.'),
  note: z
    .string()
    .trim()
    .min(3, 'Expliquez cet ajustement : il n’a aucune trace de paiement.')
    .max(120, 'Cent vingt caractères au maximum.'),
})

/**
 * Capacités déclarées d'un point : A3, finisseur (livret agrafé).
 *
 * Les deux sont facultatives — on n'envoie à la centrale que celle qui change,
 * pour qu'un basculement n'écrase jamais l'autre par mégarde.
 */
export const agentCapabilitiesSchema = z.object({
  // `agentNameSchema` est un objet : on ne reprend que le champ du nom.
  name: agentNameSchema.shape.name,
  a3: z.enum(['true', 'false']).optional(),
  finisher: z.enum(['true', 'false']).optional(),
})
