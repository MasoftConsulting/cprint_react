import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react'

import { cn } from '@/lib/cn'
import { requirePrintAdmin } from '@/features/impressions/access'
import { PrintAdminError } from '@/features/impressions/client'
import {
  ExpireJobButton,
  ResendCodeButton,
} from '@/features/impressions/components/job-actions'
import { JOB_STATUS_LABELS, formatCentralDate, formatExpiry } from '@/features/impressions/format'
import { lookupCode } from '@/features/impressions/queries'

export const metadata: Metadata = {
  title: 'Code de retrait',
}

/**
 * Fiche d'un code de retrait : ce que le client a envoyé, ce qu'il a payé,
 * et **pourquoi son code passe ou ne passe pas**. C'est l'écran de dépannage :
 * il répond en un coup d'œil à « mon code ne marche pas ».
 */
export default async function CodePage({ params }: { params: Promise<{ code: string }> }) {
  await requirePrintAdmin()
  const { code } = await params

  let detail
  try {
    detail = await lookupCode(code)
  } catch (error) {
    const message =
      error instanceof PrintAdminError ? error.message : 'Recherche impossible.'
    return (
      <div className="space-y-6">
        <Retour />
        <div className="surface-card border-destructive/30 bg-destructive/5 p-6">
          <p className="font-medium text-destructive">{message}</p>
        </div>
      </div>
    )
  }

  const paiement = detail.paiement

  return (
    <div className="space-y-6">
      <Retour />

      <header className="surface-card p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-4">
          <p className="font-mono text-3xl font-extrabold tracking-[0.2em]">{detail.code}</p>
          <span
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold',
              detail.utilisable
                ? 'bg-emerald-500/10 text-emerald-700'
                : 'bg-destructive/10 text-destructive',
            )}
          >
            {detail.utilisable ? (
              <CheckCircle2 className="h-4 w-4" aria-hidden />
            ) : (
              <XCircle className="h-4 w-4" aria-hidden />
            )}
            {detail.utilisable ? 'Utilisable' : 'Refusé à la borne'}
          </span>
        </div>
        <p className="mt-3 text-sm">{detail.explication}</p>

        {detail.documents.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-3">
            <ResendCodeButton code={detail.code} />
          </div>
        )}
      </header>

      <section className="surface-card p-6 sm:p-8">
        <h2 className="font-display text-lg font-bold">Paiement</h2>
        {paiement ? (
          <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Info label="Montant" valeur={`${paiement.amount} ${paiement.currency}`} />
            <Info label="État" valeur={paiement.status} />
            <Info label="Référence" valeur={paiement.reference} mono />
            <Info
              label="Options payées"
              valeur={`${paiement.color_mode === 'MONO' ? 'Noir & blanc' : 'Couleur'} · ${
                paiement.duplex === 'DUPLEX' ? 'Recto verso' : 'Recto'
              } · ${paiement.copies} exemplaire${paiement.copies > 1 ? 's' : ''}`}
            />
            <Info label="Pages payées" valeur={String(paiement.pages)} />
            <Info
              label="Déjà utilisé"
              valeur={paiement.consomme ? 'Oui, les pages sont sorties' : 'Non'}
            />
          </dl>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            Aucun paiement en cours pour ce code. Soit l&apos;impression est gratuite, soit le
            client n&apos;a pas terminé son paiement.
          </p>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-lg font-bold">
          {detail.documents.length} document{detail.documents.length > 1 ? 's' : ''}
        </h2>

        {detail.documents.map((doc) => (
          <article key={doc.job_id} className="surface-card p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={`/admin/impressions/documents/${doc.job_id}`}
                  className="font-display text-base font-bold hover:underline"
                >
                  {doc.original_filename}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {doc.page_count} page{doc.page_count > 1 ? 's' : ''} · reçu le{' '}
                  {formatCentralDate(doc.created_at)} · {doc.destinataire}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-secondary px-3 py-1 text-xs font-semibold">
                {JOB_STATUS_LABELS[doc.status] ?? doc.status}
              </span>
            </div>

            <dl className="mt-4 grid gap-4 sm:grid-cols-3">
              <Info
                label="Expiration"
                valeur={`${formatCentralDate(doc.expires_at)} (${formatExpiry(doc.expires_at)})`}
              />
              <Info
                label="Fichier"
                valeur={doc.fichier_present ? 'présent sur la centrale' : 'effacé'}
              />
              <Info
                label="Réservation"
                valeur={
                  doc.reserve_par
                    ? `${doc.reserve_par} jusqu'à ${formatCentralDate(doc.reservation_jusqua)}`
                    : 'aucune'
                }
              />
            </dl>

            {doc.status !== 'EXPIRED' && doc.status !== 'PRINTED' && (
              <div className="mt-4">
                <ExpireJobButton jobId={doc.job_id} filename={doc.original_filename} />
              </div>
            )}
          </article>
        ))}
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
