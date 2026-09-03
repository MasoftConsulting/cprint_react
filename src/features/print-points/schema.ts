import { z } from 'zod'

/** Un champ texte laissé vide vaut `null` en base, pas une chaîne vide. */
const optionalText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
    z.string().trim().max(max).nullable(),
  )

const optionalCoordinate = (schema: z.ZodNumber) =>
  z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? null : Number(value)),
    schema.nullable(),
  )

export const printPointSchema = z.object({
  site_name: z.string().trim().min(1, 'Champ obligatoire.').max(255),
  site_address: optionalText(255),
  city: optionalText(120),
  country: z.string().trim().min(1, 'Champ obligatoire.').max(120),
  latitude: optionalCoordinate(z.number().min(-90).max(90)),
  longitude: optionalCoordinate(z.number().min(-180).max(180)),
  // Les cases à cocher n'apparaissent dans FormData que lorsqu'elles sont cochées.
  actif: z.preprocess((value) => value === 'on' || value === 'true' || value === true, z.boolean()),
})

export type PrintPointInput = z.infer<typeof printPointSchema>

export function statusLabel(actif: boolean): string {
  return actif ? 'Actif' : 'Bientôt disponible'
}

/**
 * Adresse lisible d'un site : « Hall de la bibliothèque · Lomé · Togo ».
 * Les parties absentes sont simplement omises.
 */
export function formatSiteAddress(site: {
  site_address: string | null
  city: string | null
  country: string
}): string {
  return [site.site_address, site.city, site.country].filter(Boolean).join(' · ')
}
