import 'server-only'

import {
  canEmailAdminPrints,
  isPrintAccessRestricted,
  printAllowedEmails,
} from '@/features/impressions/access'
import { createAdminClient } from '@/lib/supabase/admin'
import type { BoardUser, BoardUsersResult } from './types'

/**
 * Lecture des comptes du back-office.
 *
 * Les comptes vivent dans Supabase **Auth**, pas dans une table du schéma
 * public : ils ne se lisent donc qu'avec la clé `service_role`, qui contourne
 * RLS. D'où `server-only` en tête de ce fichier, et un appel réservé à des
 * pages déjà authentifiées.
 *
 * Aucune mise en cache : cet écran sert à vérifier qui a accès à quoi, souvent
 * juste après avoir modifié `PRINT_ADMIN_EMAILS`.
 */

/** Une page de 200 suffit largement pour une équipe ; la boucle gère le reste. */
const PAR_PAGE = 200
/** Garde-fou : 20 pages = 4 000 comptes, bien au-delà de l'usage prévu. */
const PAGES_MAX = 20

export async function getBoardUsers(): Promise<BoardUsersResult> {
  const admin = createAdminClient()
  if (!admin) return { status: 'cle-absente' }

  const users: BoardUser[] = []
  const restricted = isPrintAccessRestricted()

  try {
    for (let page = 1; page <= PAGES_MAX; page += 1) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PAR_PAGE })
      if (error) return { status: 'erreur', message: error.message }

      for (const raw of data.users) {
        const email = raw.email ?? ''
        const metadata = raw.user_metadata as { name?: string } | null
        // Projection explicite : l'objet renvoyé par Supabase porte aussi les
        // identités, le téléphone et `app_metadata`, qui n'ont rien à faire
        // dans le navigateur.
        users.push({
          id: raw.id,
          email,
          name: metadata?.name?.trim() || email.split('@')[0] || '—',
          createdAt: raw.created_at,
          lastSignInAt: raw.last_sign_in_at ?? null,
          emailConfirmed: Boolean(raw.email_confirmed_at),
          canPrint: canEmailAdminPrints(email),
        })
      }

      // Dernière page dès qu'elle n'est pas pleine.
      if (data.users.length < PAR_PAGE) break
    }
  } catch (cause) {
    return {
      status: 'erreur',
      message: cause instanceof Error ? cause.message : 'Lecture des comptes impossible.',
    }
  }

  // Ordre alphabétique : une liste de gouvernance doit être parcourable, pas
  // classée par activité.
  users.sort((a, b) => a.email.localeCompare(b.email, 'fr'))

  const connus = new Set(users.map((user) => user.email.trim().toLowerCase()))
  const unknownAllowedEmails = printAllowedEmails().filter((email) => !connus.has(email))

  return { status: 'ok', users, printRestricted: restricted, unknownAllowedEmails }
}
