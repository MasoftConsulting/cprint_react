/**
 * Mise en forme pour l'administration des impressions. Pur affichage, donc
 * utilisable des deux côtés de la frontière serveur/client.
 */
import type { JobStatus } from './types'

/** Libellé d'un état, tel qu'on le montre dans l'interface. */
export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  RECEIVED: 'Reçu',
  READY: 'En attente de retrait',
  PRINTING: 'Impression en cours',
  PRINTED: 'Imprimé',
  ERROR: 'Erreur',
  EXPIRED: 'Expiré',
}

/** Date de la centrale (UTC, « 2026-09-25 08:12:44 ») en heure lisible. */
export function formatCentralDate(value: string | null): string {
  if (!value) return '—'
  const date = new Date(`${value.replace(' ', 'T')}Z`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

/** Ce qu'il reste avant expiration, en clair : « dans 6 h », « expiré ». */
export function formatExpiry(value: string): string {
  const date = new Date(`${value.replace(' ', 'T').slice(0, 19)}Z`)
  if (Number.isNaN(date.getTime())) return value
  const minutes = Math.round((date.getTime() - Date.now()) / 60000)
  if (minutes <= 0) return 'expiré'
  if (minutes < 60) return `dans ${minutes} min`
  const heures = Math.round(minutes / 60)
  return heures < 48 ? `dans ${heures} h` : `dans ${Math.round(heures / 24)} j`
}
