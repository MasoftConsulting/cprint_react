import 'server-only'

import { redirect } from 'next/navigation'

import { requireUser, type AdminUser } from '@/lib/dal'

/**
 * Qui peut ouvrir la section Impressions.
 *
 * `PRINT_ADMIN_EMAILS` liste les adresses autorisées, séparées par des
 * virgules. La section donne accès aux documents des clients et permet de
 * révoquer un point d'impression : elle est plus sensible que la FAQ ou les
 * tarifs, d'où cette restriction en plus de la session.
 *
 * Variable vide ou absente : tout compte admin y a accès, comme le reste du
 * back-office. C'est le comportement de repli, jamais un refus silencieux.
 */

function allowedEmails(): string[] {
  return (process.env.PRINT_ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

/** Même règle, à partir d'une adresse seule : sert à juger d'autres comptes que le sien. */
export function canEmailAdminPrints(email: string): boolean {
  const allowed = allowedEmails()
  if (allowed.length === 0) return true
  return allowed.includes(email.trim().toLowerCase())
}

export function canAdminPrints(user: AdminUser): boolean {
  return canEmailAdminPrints(user.email ?? '')
}

/**
 * La liste blanche est-elle en service ?
 *
 * `false` signifie que **tout** compte admin accède aux impressions. Sans
 * cette distinction, un écran qui affiche « autorisé » partout laisserait
 * croire à un droit accordé compte par compte, alors que c'est le repli.
 */
export function isPrintAccessRestricted(): boolean {
  return allowedEmails().length > 0
}

/** Les adresses autorisées, en minuscules. Pour les comparer aux comptes réels. */
export function printAllowedEmails(): string[] {
  return allowedEmails()
}

/**
 * Session valide **et** compte autorisé. À appeler en tête de chaque page et
 * de chaque action de la section, jamais seulement dans la navigation.
 */
export async function requirePrintAdmin(): Promise<AdminUser> {
  const user = await requireUser()
  if (!canAdminPrints(user)) redirect('/admin/dashboard')
  return user
}
