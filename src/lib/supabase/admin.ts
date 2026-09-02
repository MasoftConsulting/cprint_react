import 'server-only'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

import { publicEnv } from '@/lib/env'

/**
 * Client à privilèges élevés (service role). Contourne les politiques RLS :
 * ne l'appelle que depuis du code serveur déjà authentifié.
 * Renvoie `null` si la clé n'est pas configurée.
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) return null

  return createSupabaseClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
