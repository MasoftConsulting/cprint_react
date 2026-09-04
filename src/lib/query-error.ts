import 'server-only'

import type { PostgrestError } from '@supabase/supabase-js'

/**
 * Journalise une erreur Supabase avant de retomber sur une valeur vide.
 *
 * Sans cela, une table absente, une politique RLS trop stricte ou une colonne
 * renommée produisent exactement le même écran qu'une base réellement vide :
 * impossible de distinguer « aucune donnée » de « la requête a échoué ».
 * Le message part dans la sortie serveur, jamais vers le navigateur.
 */
export function logQueryError(context: string, error: PostgrestError | null): void {
  if (!error) return

  console.error(
    `[supabase] ${context} — ${error.message}` +
      (error.code ? ` (code ${error.code})` : '') +
      (error.hint ? ` — piste : ${error.hint}` : ''),
  )
}
