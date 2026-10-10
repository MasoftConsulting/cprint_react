'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

import { type FormState } from '@/lib/form-state'
import { requirePrintAdmin } from './access'
import { callCentral, centralPublicUrl, PrintAdminError } from './client'
import {
  agentCapabilitiesSchema,
  agentNameSchema,
  codeSchema,
  creditAccountSchema,
  creditTopUpSchema,
  jobIdSchema,
  walletAdjustSchema,
} from './schema'
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

// --- Comptes à crédit --------------------------------------------------------
// Des adresses qui impriment sans payer, sur un solde de pages acheté d'avance.
// Le solde est en pages noir & blanc : une page couleur en consomme davantage, et c'est
// la centrale qui fait ce calcul — jamais cet écran.

export async function createCreditAccount(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requirePrintAdmin()

  const parsed = creditAccountSchema.safeParse({
    email: formData.get('email'),
    label: formData.get('label'),
    pages: formData.get('pages') || 0,
  })
  if (!parsed.success) {
    return { status: 'error', errors: z.flattenError(parsed.error).fieldErrors }
  }

  const query = new URLSearchParams({ email: parsed.data.email })
  if (parsed.data.label) query.set('label', parsed.data.label)
  if (parsed.data.pages) query.set('pages', String(parsed.data.pages))

  try {
    await callCentral(`/admin/credits?${query}`, { method: 'POST' })
    revalidatePath('/admin/impressions/credits')
    return {
      status: 'success',
      message: `Compte ouvert pour ${parsed.data.email}${
        parsed.data.pages ? ` avec ${parsed.data.pages} page(s).` : '.'
      }`,
    }
  } catch (cause) {
    return echec(cause, "Le compte n'a pas pu être ouvert.")
  }
}

export async function topUpCreditAccount(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requirePrintAdmin()

  const parsed = creditTopUpSchema.safeParse({
    email: formData.get('email'),
    pages: formData.get('pages'),
    note: formData.get('note'),
  })
  if (!parsed.success) {
    return { status: 'error', errors: z.flattenError(parsed.error).fieldErrors }
  }

  const query = new URLSearchParams({ pages: String(parsed.data.pages) })
  if (parsed.data.note) query.set('note', parsed.data.note)

  try {
    const { pages_balance } = await callCentral<{ pages_balance: number }>(
      `/admin/credits/${encodeURIComponent(parsed.data.email)}/recharge?${query}`,
      { method: 'POST' },
    )
    revalidatePath('/admin/impressions/credits')
    const verbe = parsed.data.pages > 0 ? 'Rechargé de' : 'Retiré'
    return {
      status: 'success',
      message: `${verbe} ${Math.abs(parsed.data.pages)} page(s). Nouveau solde : ${pages_balance}.`,
    }
  } catch (cause) {
    return echec(cause, "La recharge n'a pas pu être enregistrée.")
  }
}

/**
 * Suspend ou réactive un compte. Le solde et l'historique sont conservés :
 * c'est presque toujours ce qu'on veut plutôt qu'une suppression.
 */
export async function setCreditAccountActive(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requirePrintAdmin()

  const email = creditTopUpSchema.shape.email.safeParse(formData.get('email'))
  if (!email.success) return { status: 'error', message: 'Compte inconnu.' }
  const actif = formData.get('actif') === 'true'

  try {
    await callCentral(
      `/admin/credits/${encodeURIComponent(email.data)}/actif?actif=${actif}`,
      { method: 'POST' },
    )
    revalidatePath('/admin/impressions/credits')
    return {
      status: 'success',
      message: actif
        ? `Compte ${email.data} réactivé.`
        : `Compte ${email.data} suspendu : il paiera comme un client ordinaire.`,
    }
  } catch (cause) {
    return echec(cause, "Le compte n'a pas pu être modifié.")
  }
}

// --- Portefeuilles PrintPoint ------------------------------------------------
// En argent, et rechargés par le client lui-même en ligne. Cette
// administration ne recharge pas à sa place : elle constate, et corrige.

/**
 * Corrige un solde à la main : geste commercial, ou recharge encaissée en
 * espèces au comptoir.
 *
 * Un montant négatif retire de l'argent, et la centrale l'accepte même si le
 * solde passe sous zéro — corriger un crédit accordé par erreur ne doit pas
 * être bloqué par ce crédit lui-même.
 */
export async function adjustWallet(_prev: FormState, formData: FormData): Promise<FormState> {
  await requirePrintAdmin()

  const parsed = walletAdjustSchema.safeParse({
    email: formData.get('email'),
    montant: formData.get('montant'),
    note: formData.get('note'),
  })
  if (!parsed.success) {
    return { status: 'error', errors: z.flattenError(parsed.error).fieldErrors }
  }

  const query = new URLSearchParams({
    montant: String(parsed.data.montant),
    note: parsed.data.note,
  })

  try {
    const { balance } = await callCentral<{ balance: number }>(
      `/admin/portefeuilles/${encodeURIComponent(parsed.data.email)}/ajustement?${query}`,
      { method: 'POST' },
    )
    revalidatePath('/admin/impressions/portefeuilles')
    revalidatePath(`/admin/impressions/portefeuilles/${encodeURIComponent(parsed.data.email)}`)
    const verbe = parsed.data.montant > 0 ? 'Crédité de' : 'Retiré'
    return {
      status: 'success',
      message: `${verbe} ${Math.abs(parsed.data.montant).toLocaleString('fr-FR')}. Nouveau solde : ${balance.toLocaleString('fr-FR')}.`,
    }
  } catch (cause) {
    return echec(cause, "L'ajustement n'a pas pu être enregistré.")
  }
}

/**
 * Déclare ce que la machine d'un point sait faire : A3, finisseur.
 *
 * Volontairement saisi plutôt que déduit. La présence d'un finisseur ne se
 * devine pas de façon fiable, et surtout, cocher engage : c'est l'attestation
 * de quelqu'un qui a vu un livret correct sortir de **cette** machine. Le
 * livret repose sur des commandes propres à Sharp ; sans cette attestation,
 * on ferait payer une reliure sur une hypothèse.
 *
 * Se retire aussi vite qu'elle se pose : c'est la marche arrière la plus
 * rapide du service, sans redéploiement ni perte de données.
 */
export async function setAgentCapabilities(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requirePrintAdmin()

  const parsed = agentCapabilitiesSchema.safeParse({
    name: formData.get('name'),
    a3: formData.get('a3') ?? undefined,
    finisher: formData.get('finisher') ?? undefined,
  })
  if (!parsed.success) {
    return { status: 'error', message: 'Point inconnu.' }
  }

  const query = new URLSearchParams()
  if (parsed.data.a3 !== undefined) query.set('a3', parsed.data.a3)
  if (parsed.data.finisher !== undefined) query.set('finisher', parsed.data.finisher)
  if (query.size === 0) {
    return { status: 'error', message: 'Aucune capacité à modifier.' }
  }

  try {
    await callCentral(
      `/admin/agents/${encodeURIComponent(parsed.data.name)}/capacites?${query}`,
      { method: 'POST' },
    )
    revalidatePath('/admin/impressions/points')
    const quoi = parsed.data.a3 !== undefined ? 'A3' : 'Finisseur'
    const etat = (parsed.data.a3 ?? parsed.data.finisher) === 'true' ? 'activé' : 'retiré'
    return { status: 'success', message: `${quoi} ${etat} pour ${parsed.data.name}.` }
  } catch (cause) {
    return echec(cause, "La capacité n'a pas pu être modifiée.")
  }
}
