import 'server-only'

import { createClient } from '@/lib/supabase/server'

export type ContactMessage = {
  id_message: number
  nom: string
  email: string
  telephone: string | null
  message: string
  lu: boolean
  created_at: string
}

const COLUMNS = 'id_message, nom, email, telephone, message, lu, created_at'

/**
 * Messages reçus, les plus récents d'abord.
 * Aucune mise en cache : la table n'est lisible que par un compte authentifié,
 * donc la lecture dépend de la session.
 */
export async function getContactMessages(): Promise<ContactMessage[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('contact_messages')
    .select(COLUMNS)
    .order('created_at', { ascending: false })

  if (error || !data) return []

  return data.map((row) => ({
    id_message: Number(row.id_message),
    nom: String(row.nom),
    email: String(row.email),
    telephone: row.telephone === null ? null : String(row.telephone),
    message: String(row.message),
    lu: row.lu === true,
    created_at: String(row.created_at),
  }))
}

export async function getUnreadMessagesCount(): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('contact_messages')
    .select('id_message', { count: 'exact', head: true })
    .eq('lu', false)

  return count ?? 0
}

/** Formate un horodatage ISO pour l'affichage en français. */
export function formatReceivedAt(value: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}
