import 'server-only'

import { cache } from 'react'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

export type AdminUser = {
  id: string
  email: string
  name: string
}

/**
 * Utilisateur courant, ou `null`. Mémoïsé par rendu : appeler cette fonction
 * dans plusieurs composants ne déclenche qu'un seul aller-retour Supabase.
 */
export const getCurrentUser = cache(async (): Promise<AdminUser | null> => {
  const supabase = await createClient()
  // `getUser()` revalide le jeton auprès de Supabase, contrairement à
  // `getSession()` qui fait confiance au cookie : c'est la seule forme sûre côté serveur.
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return null

  const metadata = data.user.user_metadata as { name?: string } | null

  return {
    id: data.user.id,
    email: data.user.email ?? '',
    name: metadata?.name?.trim() || (data.user.email ?? '').split('@')[0],
  }
})

/**
 * Garde d'autorisation à utiliser en tête de chaque page et Server Action
 * de l'espace admin. Le `proxy.ts` n'est qu'une optimisation d'UX, pas une barrière.
 */
export async function requireUser(): Promise<AdminUser> {
  const user = await getCurrentUser()
  if (!user) redirect('/admin')
  return user
}
