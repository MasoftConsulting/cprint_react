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
  /**
   * Point d'impression de la centrale (`agents.name`) installé sur ce site.
   *
   * Facultatif : un site peut exister au catalogue avant qu'une borne n'y
   * soit posée. Sans ce rattachement, la page publique affiche le site sans
   * état — plutôt qu'un « ouvert » qu'elle ne saurait pas vérifier.
   */
  agent_name: optionalText(40),
})

export type PrintPointInput = z.infer<typeof printPointSchema>

/**
 * Lit le formulaire d'un site **d'après le schéma**, champ par champ.
 *
 * L'ancienne lecture recopiait la liste des champs à la main. Le jour où
 * `agent_name` a été ajouté au schéma mais pas à cette liste, le champ
 * arrivait `undefined`, le schéma le refusait, et plus aucun site ne pouvait
 * être enregistré — ni créé, ni modifié. Dériver la liste du schéma rend cet
 * oubli impossible.
 *
 * Un champ absent du formulaire vaut `null` (`FormData.get`), ce que chaque
 * champ facultatif accepte, et qu'une case décochée doit valoir.
 */
export function parsePrintPoint(formData: FormData) {
  const brut = Object.fromEntries(
    Object.keys(printPointSchema.shape).map((champ) => [champ, formData.get(champ)]),
  )
  return printPointSchema.safeParse(brut)
}

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
