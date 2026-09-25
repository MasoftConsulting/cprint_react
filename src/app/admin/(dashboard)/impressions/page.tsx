import { Suspense } from 'react'
import Link from 'next/link'
import type { Metadata } from 'next'
import { AlertTriangle, FileText, Printer } from 'lucide-react'

import { CardsSkeleton } from '@/components/ui/skeletons'
import { cn } from '@/lib/cn'
import { requirePrintAdmin } from '@/features/impressions/access'
import { PrintAdminError } from '@/features/impressions/client'
import { CodeSearch } from '@/features/impressions/components/code-search'
import { JOB_STATUS_LABELS, formatCentralDate, formatExpiry } from '@/features/impressions/format'
import { getPrintJobs, getPrintStats } from '@/features/impressions/queries'
import type { JobStatus } from '@/features/impressions/types'

export const metadata: Metadata = {
  title: 'Impressions',
}

const STATUS_CLASS: Record<JobStatus, string> = {
  RECEIVED: 'bg-secondary text-muted-foreground',
  READY: 'bg-primary/10 text-primary',
  PRINTING: 'bg-amber-500/10 text-amber-700',
  PRINTED: 'bg-emerald-500/10 text-emerald-700',
  ERROR: 'bg-destructive/10 text-destructive',
  EXPIRED: 'bg-secondary text-muted-foreground',
}

export function StatusBadge({ status }: { status: JobStatus }) {
  return (
    <span
      className={cn(
        'shrink-0 rounded-full px-3 py-1 text-xs font-semibold',
        STATUS_CLASS[status] ?? 'bg-secondary text-muted-foreground',
      )}
    >
      {JOB_STATUS_LABELS[status] ?? status}
    </span>
  )
}

/** Panne de la centrale : on le dit, sans masquer le reste de l'admin. */
function CentralDown({ error }: { error: unknown }) {
  const message =
    error instanceof PrintAdminError
      ? error.message
      : "Le service d'impression est injoignable."

  return (
    <div className="surface-card flex gap-3 border-amber-500/30 bg-amber-500/5 p-6">
      <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" aria-hidden />
      <div>
        <p className="font-medium">Service d&apos;impression injoignable</p>
        <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  )
}

async function Overview() {
  await requirePrintAdmin()

  let stats
  let jobs
  try {
    ;[stats, jobs] = await Promise.all([getPrintStats(), getPrintJobs(15)])
  } catch (error) {
    return <CentralDown error={error} />
  }

  const enAttente = stats.documents_par_etat.READY ?? 0
  const chiffres = [
    { valeur: enAttente, libelle: 'documents en attente de retrait' },
    { valeur: stats.dernieres_24h.documents_recus, libelle: 'reçus depuis 24 h' },
    { valeur: stats.dernieres_24h.pages_imprimees, libelle: 'pages imprimées depuis 24 h' },
    {
      valeur: `${stats.dernieres_24h.encaisse.toLocaleString('fr-FR')} ${stats.devise}`,
      libelle: 'encaissés depuis 24 h',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {chiffres.map(({ valeur, libelle }) => (
          <div key={libelle} className="surface-card p-6">
            <p className="font-display text-3xl font-extrabold text-primary">{valeur}</p>
            <p className="mt-1 text-sm text-muted-foreground">{libelle}</p>
          </div>
        ))}
      </div>

      <CodeSearch />

      <section className="surface-card p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold">Points d&apos;impression</h2>
          <Link
            href="/admin/impressions/points"
            className="text-sm font-medium text-primary hover:underline"
          >
            Gérer les points
          </Link>
        </div>

        {stats.points.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Aucun point déclaré. Créez-en un depuis « Gérer les points », puis installez l&apos;agent
            sur le PC relié à l&apos;imprimante.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {stats.points.map((point) => (
              <li
                key={point.name}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-border px-4 py-3"
              >
                <Printer className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                <span className="font-medium">{point.name}</span>
                <span className="text-xs text-muted-foreground">
                  {point.printer_label ?? 'imprimante non précisée'}
                </span>
                <span className="ml-auto text-xs text-muted-foreground">
                  vu {formatCentralDate(point.last_seen_at)}
                </span>
                <span
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-semibold',
                    point.last_status === 'ONLINE'
                      ? 'bg-emerald-500/10 text-emerald-700'
                      : 'bg-amber-500/10 text-amber-700',
                  )}
                >
                  {point.last_status ?? 'jamais vu'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="surface-card p-6 sm:p-8">
        <h2 className="font-display text-lg font-bold">Derniers documents</h2>
        {jobs.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Aucun document pour l&apos;instant.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {jobs.map((job) => (
              <li key={job.id} className="flex flex-wrap items-center gap-3 py-3">
                <FileText className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                <Link
                  href={`/admin/impressions/documents/${job.id}`}
                  className="min-w-0 flex-1 truncate font-medium hover:underline"
                >
                  {job.original_filename}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {job.page_count} p. · {formatCentralDate(job.created_at)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {job.status === 'READY' ? formatExpiry(job.expires_at) : ''}
                </span>
                <StatusBadge status={job.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export default function ImpressionsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-extrabold sm:text-3xl">Impressions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ce que le service d&apos;impression a reçu, imprimé et encaissé, et l&apos;état des points.
        </p>
      </header>

      <Suspense fallback={<CardsSkeleton />}>
        <Overview />
      </Suspense>
    </div>
  )
}
