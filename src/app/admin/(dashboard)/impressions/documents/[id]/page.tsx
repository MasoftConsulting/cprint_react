import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ArrowLeft } from 'lucide-react'

import { cn } from '@/lib/cn'
import { requirePrintAdmin } from '@/features/impressions/access'
import { PrintAdminError } from '@/features/impressions/client'
import { ExpireJobButton } from '@/features/impressions/components/job-actions'
import { JOB_STATUS_LABELS, formatCentralDate, formatExpiry } from '@/features/impressions/format'
import { getJobEvents, getPrintJob } from '@/features/impressions/queries'

export const metadata: Metadata = {
  title: 'Document',
}

/**
 * Historique complet d'un document : ce que la centrale a enregistré, dans
 * l'ordre. C'est ce journal qui explique une panne — réservation par un
 * point, échec d'impression, effacement du fichier.
 */
export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePrintAdmin()
  const { id } = await params
  const jobId = Number(id)
  if (!Number.isInteger(jobId)) notFound()

  let job
  let events
  try {
    ;[job, events] = await Promise.all([getPrintJob(jobId), getJobEvents(jobId)])
  } catch (error) {
    const message = error instanceof PrintAdminError ? error.message : 'Lecture impossible.'
    return (
      <div className="space-y-6">
        <Retour />
        <div className="surface-card border-destructive/30 bg-destructive/5 p-6">
          <p className="font-medium text-destructive">{message}</p>
        </div>
      </div>
    )
  }

  if (!job) notFound()

  return (
    <div className="space-y-6">
      <Retour />

      <header className="surface-card p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-xl font-extrabold break-words">
              {job.original_filename}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Envoyé par {job.sender_email} — le code lui est adressé
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-secondary px-3 py-1 text-xs font-semibold">
            {JOB_STATUS_LABELS[job.status] ?? job.status}
          </span>
        </div>

        <Link
          href={`/admin/impressions/code/${job.verification_code}`}
          className="mt-5 inline-flex items-center gap-3 rounded-xl bg-primary/10 px-5 py-3 transition-colors hover:bg-primary/15"
        >
          <span className="text-xs font-medium text-muted-foreground">Code de retrait</span>
          <span className="font-mono text-2xl font-extrabold tracking-[0.2em] text-primary">
            {job.verification_code}
          </span>
        </Link>

        <dl className="mt-5 grid gap-4 sm:grid-cols-3">
          <Info label="Pages" valeur={`${job.page_count} × ${job.copies} exemplaire(s)`} />
          <Info
            label="Options"
            valeur={`${job.color_mode === 'MONO' ? 'Noir & blanc' : 'Couleur'} · ${
              job.duplex === 'DUPLEX' ? 'Recto verso' : 'Recto'
            }`}
          />
          <Info label="Reçu le" valeur={formatCentralDate(job.created_at)} />
          <Info
            label="Expiration"
            valeur={`${formatCentralDate(job.expires_at)} (${formatExpiry(job.expires_at)})`}
          />
          <Info label="Imprimé le" valeur={formatCentralDate(job.printed_at)} />
          {job.error_message && <Info label="Erreur" valeur={job.error_message} />}
        </dl>

        {job.status !== 'EXPIRED' && job.status !== 'PRINTED' && (
          <div className="mt-5">
            <ExpireJobButton jobId={job.id} filename={job.original_filename} />
          </div>
        )}
      </header>

      <section className="surface-card p-6 sm:p-8">
        <h2 className="font-display text-lg font-bold">Historique</h2>
        <ol className="mt-4 space-y-3">
          {events.map((event, index) => (
            <li key={`${event.created_at}-${index}`} className="flex gap-4 text-sm">
              <span className="w-28 shrink-0 text-xs text-muted-foreground">
                {formatCentralDate(event.created_at)}
              </span>
              <span className="w-52 shrink-0 font-mono text-xs font-semibold">{event.event}</span>
              <span className="min-w-0 text-muted-foreground">{event.message}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}

function Retour() {
  return (
    <Link
      href="/admin/impressions"
      className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden />
      Retour aux impressions
    </Link>
  )
}

function Info({ label, valeur, mono }: { label: string; valeur: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn('mt-1 text-sm font-medium break-words', mono && 'font-mono text-xs')}>
        {valeur}
      </dd>
    </div>
  )
}
