import 'server-only'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

import { publicEnv } from '@/lib/env'

/**
 * Client Supabase sans session, pour les lectures publiques mises en cache
 * (`use cache`) : ces fonctions ne peuvent pas lire les cookies.
 */
export function createAnonClient() {
  return createSupabaseClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}
