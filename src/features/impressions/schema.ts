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
