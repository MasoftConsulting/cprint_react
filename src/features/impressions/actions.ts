'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

import { type FormState } from '@/lib/form-state'
import { requirePrintAdmin } from './access'
import { callCentral, centralPublicUrl, PrintAdminError } from './client'
import { agentNameSchema, codeSchema, jobIdSchema } from './schema'
import type { AgentCredentials } from './types'

/**
 * État des formulaires qui créent ou renouvellent un point.
 *
 * `credentials` ne porte le jeton que sur ce seul aller-retour : il sert à
 * fabriquer l'installeur dans la page, puis disparaît au rechargement. La
 * centrale ne pourra pas le redonner — elle n'en garde que l'empreinte.
 */
export type AgentFormState = FormState & { credentials?: AgentCredentials }

/**
 * Actions de l'administration des impressions.
 *
 * Chacune revérifie la session **et** l'autorisation : une Server Action est
 * une route publique, la navigation qui la déclenche ne prouve rien. Le jeton
 * d'administration reste côté serveur, dans `client.ts`.
 *
 * Elles agissent sur la centrale, pas sur Supabase : c'est elle qui détient
 * les documents, les codes et les points.
 */

function echec(cause: unknown, repli: string): FormState {
  return {
    status: 'error',
    message: cause instanceof PrintAdminError ? cause.message : repli,
  }
}

/** Recherche d'un code : redirige vers sa fiche, ou revient avec le message. */
export async function searchCode(_prev: FormState, formData: FormData): Promise<FormState> {
  await requirePrintAdmin()

  const parsed = codeSchema.safeParse(formData.get('code'))
  if (!parsed.success) {
    return { status: 'error', message: 'Un code de retrait compte 6 chiffres.' }
  }

  redirect(`/admin/impressions/code/${parsed.data}`)
}

export async function expireJob(_prev: FormState, formData: FormData): Promise<FormState> {
  await requirePrintAdmin()

  const parsed = jobIdSchema.safeParse(formData.get('job_id'))
  if (!parsed.success) return { status: 'error', message: 'Document inconnu.' }

  try {
    await callCentral(`/admin/jobs/${parsed.data}/expire`, { method: 'POST' })
  } catch (cause) {
    return echec(cause, "L'expiration a échoué.")
  }

  revalidatePath('/admin/impressions', 'layout')
  return {
    status: 'success',
    message: 'Document expiré : son code ne vaut plus rien et son fichier a été effacé.',
  }
}

export async function resendCode(_prev: FormState, formData: FormData): Promise<FormState> {
  await requirePrintAdmin()

  const parsed = codeSchema.safeParse(formData.get('code'))
  if (!parsed.success) return { status: 'error', message: 'Code invalide.' }

  try {
    const { envoye_a } = await callCentral<{ envoye_a: string }>(
      `/admin/codes/${parsed.data}/resend`,
      { method: 'POST' },
    )
    return { status: 'success', message: `Code renvoyé à ${envoye_a}.` }
  } catch (cause) {
    return echec(cause, "L'e-mail n'a pas pu être renvoyé.")
  }
}

export async function createAgent(
  _prev: AgentFormState,
  formData: FormData,
): Promise<AgentFormState> {
  await requirePrintAdmin()

  const parsed = agentNameSchema.safeParse({
    name: formData.get('name'),
    printer_label: formData.get('printer_label'),
    printer_ip: formData.get('printer_ip'),
  })
  if (!parsed.success) {
    return { status: 'error', errors: z.flattenError(parsed.error).fieldErrors }
  }

  const query = new URLSearchParams({ name: parsed.data.name })
  if (parsed.data.printer_label) query.set('printer_label', parsed.data.printer_label)

  try {
    const { token } = await callCentral<{ token: string }>(`/admin/agents?${query}`, {
      method: 'POST',
    })
    revalidatePath('/admin/impressions/points')
    // Le jeton ne passe qu'ici : la centrale n'en garde que l'empreinte, et
    // c'est de ce retour que la page tire l'installeur du point.
    return {
      status: 'success',
      message: `Point « ${parsed.data.name} » créé.`,
      credentials: {
        name: parsed.data.name,
        token,
        central: centralPublicUrl,
        printerIp: parsed.data.printer_ip || undefined,
      },
    }
  } catch (cause) {
    return echec(cause, "Le point n'a pas pu être créé.")
  }
}

export async function rotateAgentToken(
  _prev: AgentFormState,
  formData: FormData,
): Promise<AgentFormState> {
  await requirePrintAdmin()

  const parsed = agentNameSchema.shape.name.safeParse(formData.get('name'))
  if (!parsed.success) return { status: 'error', message: 'Point inconnu.' }

  try {
    const { token } = await callCentral<{ token: string }>(
      `/admin/agents/${encodeURIComponent(parsed.data)}/token`,
      { method: 'POST' },
    )
    revalidatePath('/admin/impressions/points')
    // Pas d'IP d'imprimante ici : un point dont on renouvelle le jeton est
    // déjà installé, son fichier de réglages porte déjà la bonne adresse.
    return {
      status: 'success',
      message: `Nouveau jeton pour « ${parsed.data} ».`,
      credentials: { name: parsed.data, token, central: centralPublicUrl },
    }
  } catch (cause) {
    return echec(cause, 'Le jeton n’a pas pu être renouvelé.')
  }
}

export async function deleteAgent(_prev: FormState, formData: FormData): Promise<FormState> {
  await requirePrintAdmin()

  const parsed = agentNameSchema.shape.name.safeParse(formData.get('name'))
  if (!parsed.success) return { status: 'error', message: 'Point inconnu.' }

  try {
    await callCentral(`/admin/agents/${encodeURIComponent(parsed.data)}`, { method: 'DELETE' })
  } catch (cause) {
    return echec(cause, "Le point n'a pas pu être supprimé.")
  }

  revalidatePath('/admin/impressions/points')
  return {
    status: 'success',
    message: `Point « ${parsed.data} » supprimé : son jeton ne vaut plus rien.`,
  }
}
