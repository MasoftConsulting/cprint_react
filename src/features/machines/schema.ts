import { z } from 'zod'

/** Un champ texte laissé vide vaut `null` en base, pas une chaîne vide. */
const optionalText = (max: number, extra?: (schema: z.ZodString) => z.ZodString) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
    (extra ? extra(z.string().trim()) : z.string().trim()).max(max).nullable(),
  )

/** Une date vide vaut `null` ; sinon le format attendu est celui de `<input type="date">`. */
const optionalDate = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide.')
    .nullable(),
)

/** Format de papier pris en charge. */
export const machineTypes = ['A4', 'A3'] as const
export type MachineType = (typeof machineTypes)[number]

/** Rendu d'impression. */
export const machineFonctions = ['mono', 'couleur'] as const
export type MachineFonction = (typeof machineFonctions)[number]

export const MACHINE_TYPE_LABELS: Record<MachineType, string> = {
  A4: 'A4',
  A3: 'A3',
}

export const MACHINE_FONCTION_LABELS: Record<MachineFonction, string> = {
  mono: 'Mono',
  couleur: 'Couleur',
}

/**
 * Une option vraie par défaut : seule la valeur « false » la désactive. Un
 * formulaire qui ne porte pas le champ garde donc l'option ouverte — c'est
 * aussi la valeur par défaut en base.
 */
const optionVraieParDefaut = z.preprocess(
  (value) => !(value === 'false' || value === false),
  z.boolean(),
)

const MAC_PATTERN = /^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/
const IPV4_PATTERN = /^(\d{1,3}\.){3}\d{1,3}$/

export const machineSchema = z
  .object({
    serial_number: z.string().trim().min(1, 'Champ obligatoire.').max(120),
    machine_name: optionalText(255),
    mac_address: optionalText(17, (s) =>
      s.regex(MAC_PATTERN, 'Format attendu : 00:1A:2B:3C:4D:5E.'),
    ),
    ip_address: optionalText(45, (s) => s.regex(IPV4_PATTERN, 'Format attendu : 192.168.1.10.')),
    type: z.enum(machineTypes, { message: 'Choisissez un format.' }),
    fonction: z.enum(machineFonctions, { message: 'Choisissez une fonction.' }),
    date_acquisition: optionalDate,
    date_mise_service: optionalDate,
    actif: z.preprocess(
      (value) => value === 'on' || value === 'true' || value === true,
      z.boolean(),
    ),
    // Affichées sur la page Points (migration 005). Une multifonction Sharp
    // photocopie et scanne : vraies par défaut.
    photocopie: optionVraieParDefaut,
    scan: optionVraieParDefaut,
  })
  .superRefine((data, ctx) => {
    if (!data.date_acquisition || !data.date_mise_service) return
    if (data.date_mise_service < data.date_acquisition) {
      ctx.addIssue({
        code: 'custom',
        path: ['date_mise_service'],
        message: "La mise en service ne peut pas précéder l'acquisition.",
      })
    }
  })

export type MachineInput = z.infer<typeof machineSchema>

/** Lit le formulaire d'une machine d'après le schéma : aucun champ ne peut être oublié. */
export function parseMachine(formData: FormData) {
  const champs = Object.keys(machineSchema.shape) as (keyof MachineInput)[]
  return machineSchema.safeParse(
    Object.fromEntries(champs.map((champ) => [champ, formData.get(champ)])),
  )
}

/** Les deux options qui n'existent en base qu'après la migration 005. */
export const OPTIONS_MIGRATION_005 = ['photocopie', 'scan'] as const

export function machineLabel(machine: {
  machine_name: string | null
  serial_number: string
}): string {
  return machine.machine_name?.trim() || machine.serial_number
}

export function machineStatusLabel(actif: boolean): string {
  return actif ? 'Active' : 'Hors service'
}

/** Résumé lisible des capacités : « A3 · Couleur ». */
/**
 * Ce que la machine sait faire, en une ligne : « A3 · Couleur · Photocopie ·
 * Scan ». Les mêmes options que la page Points, pour que l'exploitant voie ce
 * que voit le client.
 */
export function machineCapabilities(machine: {
  type: MachineType
  fonction: MachineFonction
  photocopie?: boolean
  scan?: boolean
}): string {
  return [
    MACHINE_TYPE_LABELS[machine.type],
    MACHINE_FONCTION_LABELS[machine.fonction],
    machine.photocopie !== false && 'Photocopie',
    machine.scan !== false && 'Scan',
  ]
    .filter(Boolean)
    .join(' · ')
}

/** Formate une date ISO (`2026-09-03`) pour l'affichage en français. */
export function formatDate(value: string | null): string {
  if (!value) return '—'
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}
