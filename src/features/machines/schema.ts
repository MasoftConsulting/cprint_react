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
    date_acquisition: optionalDate,
    date_mise_service: optionalDate,
    actif: z.preprocess(
      (value) => value === 'on' || value === 'true' || value === true,
      z.boolean(),
    ),
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

export function machineLabel(machine: {
  machine_name: string | null
  serial_number: string
}): string {
  return machine.machine_name?.trim() || machine.serial_number
}

export function machineStatusLabel(actif: boolean): string {
  return actif ? 'Active' : 'Hors service'
}

/** Formate une date ISO (`2026-09-03`) pour l'affichage en français. */
export function formatDate(value: string | null): string {
  if (!value) return '—'
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}
