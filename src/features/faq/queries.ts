import 'server-only'

import { cacheLife, cacheTag } from 'next/cache'

import { createAnonClient } from '@/lib/supabase/anon'
import type { FaqPage } from '@/features/faq/schema'
import { logQueryError } from '@/lib/query-error'

export const FAQ_TAG = 'faq'

export type FaqEntry = {
  id_faq: number
  page: FaqPage
  question: string
  reponse: string
  position: number
  actif: boolean
}

const COLUMNS = 'id_faq, page, question, reponse, position, actif'

function normalize(row: Record<string, unknown>): FaqEntry {
  return {
    id_faq: Number(row.id_faq),
    page: row.page === 'tarifs' ? 'tarifs' : 'comment-ca-marche',
    question: String(row.question),
    reponse: String(row.reponse),
    position: Number(row.position ?? 0),
    actif: row.actif === true,
  }
}

/**
 * Questions publiées d'une page, dans l'ordre d'affichage.
 * En cache : elles changent rarement et sont lues à chaque visite.
 */
export async function getFaqForPage(page: FaqPage): Promise<FaqEntry[]> {
  'use cache'
  cacheTag(FAQ_TAG)
  cacheLife('max')

  const supabase = createAnonClient()
  const { data, error } = await supabase
    .from('faq')
    .select(COLUMNS)
    .eq('page', page)
    .eq('actif', true)
    .order('position', { ascending: true })

  if (error || !data) {
    logQueryError(`lecture de la FAQ (page ${page})`, error)
    return []
  }
  return data.map((row) => normalize(row as Record<string, unknown>))
}

/** Toutes les questions, publiées ou non — pour l'écran d'administration. */
export async function getAllFaq(): Promise<FaqEntry[]> {
  'use cache'
  cacheTag(FAQ_TAG)
  cacheLife('max')

  const supabase = createAnonClient()
  const { data, error } = await supabase
    .from('faq')
    .select(COLUMNS)
    .order('page', { ascending: true })
    .order('position', { ascending: true })

  if (error || !data) {
    logQueryError('lecture de la FAQ', error)
    return []
  }
  return data.map((row) => normalize(row as Record<string, unknown>))
}

/** Lecture non mise en cache, pour le formulaire de modification. */
export async function findFaq(idFaq: number): Promise<FaqEntry | null> {
  const supabase = createAnonClient()
  const { data, error } = await supabase
    .from('faq')
    .select(COLUMNS)
    .eq('id_faq', idFaq)
    .maybeSingle()

  if (error) logQueryError('lecture d’une question de FAQ', error)
  if (error || !data) return null
  return normalize(data as Record<string, unknown>)
}
