import 'server-only'

import { callCentral } from './client'
import type {
  CodeDetail,
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
