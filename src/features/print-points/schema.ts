import { z } from 'zod'

export const printPointStatuses = ['actif', 'bientot'] as const
export type PrintPointStatus = (typeof printPointStatuses)[number]

const optionalCoordinate = (schema: z.ZodNumber) =>
  z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? null : Number(value)),
    schema.nullable(),
  )

export const printPointSchema = z.object({
  name: z.string().trim().min(1, 'Champ obligatoire.').max(255),
  location: z.string().trim().min(1, 'Champ obligatoire.').max(255),
  hours: z.string().trim().min(1, 'Champ obligatoire.').max(255),
  status: z.enum(printPointStatuses, { message: 'Statut invalide.' }),
  latitude: optionalCoordinate(z.number().min(-90).max(90)),
  longitude: optionalCoordinate(z.number().min(-180).max(180)),
  position: z.coerce.number().int().min(0).default(0),
})

export type PrintPointInput = z.infer<typeof printPointSchema>

export function statusLabel(status: PrintPointStatus): string {
  return status === 'actif' ? 'Actif' : 'Bientôt disponible'
}
