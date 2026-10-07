import 'server-only'

import { callCentral } from './client'
import type {
  CodeDetail,
  Expediteur,
  JobEvent,
  PrintAgent,
  PrintJob,
  PrintStats,
} from './types'

/**
 * Lectures de l'administration des impressions.
 *
 * Elles interrogent l'API centrale, pas Supabase : les documents, codes et
 * paiements y vivent, jamais dans la base du site. Aucune mise en cache —
 * ces écrans servent à voir l'état courant, souvent pendant qu'un client
 * attend devant une borne.
 */

export function getPrintStats() {
  return callCentral<PrintStats>('/admin/stats')
}

export function getPrintJobs(limit = 30) {
  return callCentral<PrintJob[]>(`/admin/jobs?limit=${limit}`)
}

export function getPrintJob(jobId: number) {
  // La centrale n'expose pas un document seul : on le retrouve dans la liste,
  // qui est déjà triée du plus récent au plus ancien.
  return getPrintJobs(200).then((jobs) => jobs.find((job) => job.id === jobId) ?? null)
}

export function getJobEvents(jobId: number) {
  return callCentral<JobEvent[]>(`/admin/jobs/${jobId}/events`)
}

export function getPrintAgents() {
  return callCentral<PrintAgent[]>('/admin/agents')
}

export function lookupCode(code: string) {
  return callCentral<CodeDetail>(`/admin/codes/${encodeURIComponent(code.trim())}`)
}

/**
 * Activité par expéditeur, du plus gros consommateur au plus petit.
 *
 * `depuis` et `jusqua` sont des dates `AAAA-MM-JJ` appliquées à la date
 * d'envoi, bornes incluses. `detail: false` n'apporte que les totaux : à
 * utiliser dès qu'on n'affiche pas la liste des documents, elle pèse.
 */
export function getExpediteurs(options: {
  depuis?: string
  jusqua?: string
  detail?: boolean
} = {}) {
  const query = new URLSearchParams()
  if (options.depuis) query.set('depuis', options.depuis)
  if (options.jusqua) query.set('jusqua', options.jusqua)
  if (options.detail === false) query.set('detail', 'false')
  const suffixe = query.size > 0 ? `?${query}` : ''
  return callCentral<Expediteur[]>(`/admin/expediteurs${suffixe}`)
}
