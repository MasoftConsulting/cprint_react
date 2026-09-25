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
})
