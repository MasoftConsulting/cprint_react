import 'server-only'

import { cacheLife, cacheTag } from 'next/cache'

import { createAnonClient } from '@/lib/supabase/anon'
import type { PrintPointStatus } from '@/features/print-points/schema'

export const PRINT_POINTS_TAG = 'print-points'

export type PrintPoint = {
  id: number
  name: string
  location: string
  hours: string
  status: PrintPointStatus
  latitude: number | null
  longitude: number | null
  position: number
}

const COLUMNS = 'id, name, location, hours, status, latitude, longitude, position'

function normalize(row: Record<string, unknown>): PrintPoint {
  return {
    id: Number(row.id),
    name: String(row.name),
    location: String(row.location),
    hours: String(row.hours),
    status: row.status === 'actif' ? 'actif' : 'bientot',
    // Postgres renvoie les `numeric` en chaîne pour préserver la précision.
    latitude: row.latitude === null || row.latitude === undefined ? null : Number(row.latitude),
    longitude: row.longitude === null || row.longitude === undefined ? null : Number(row.longitude),
    position: Number(row.position ?? 0),
  }
}

/**
 * Points d'impression, actifs d'abord puis par position — équivalent du
 * scope `ordered()` du modèle Eloquent.
 */
export async function getPrintPoints(): Promise<PrintPoint[]> {
  'use cache'
  cacheTag(PRINT_POINTS_TAG)
  cacheLife('max')

  const supabase = createAnonClient()
  const { data, error } = await supabase
    .from('print_points')
    .select(COLUMNS)
    .order('status', { ascending: true }) // 'actif' avant 'bientot' dans l'enum
    .order('position', { ascending: true })

  if (error || !data) return []
  return data.map((row) => normalize(row as Record<string, unknown>))
}

export async function getActivePrintPointsCount(): Promise<number> {
  'use cache'
  cacheTag(PRINT_POINTS_TAG)
  cacheLife('max')

  const supabase = createAnonClient()
  const { count } = await supabase
    .from('print_points')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'actif')

  return count ?? 0
}

/** Lecture non mise en cache, pour les écrans d'administration. */
export async function findPrintPoint(id: number): Promise<PrintPoint | null> {
  const supabase = createAnonClient()
  const { data, error } = await supabase
    .from('print_points')
    .select(COLUMNS)
    .eq('id', id)
    .maybeSingle()

  if (error || !data) return null
  return normalize(data as Record<string, unknown>)
}

export function hasCoordinates(point: PrintPoint): boolean {
  return point.latitude !== null && point.longitude !== null
}
