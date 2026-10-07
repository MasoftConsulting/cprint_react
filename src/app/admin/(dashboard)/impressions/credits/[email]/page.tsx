import { Suspense } from 'react'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowLeft, Wallet } from 'lucide-react'

import { CardsSkeleton } from '@/components/ui/skeletons'
import { cn } from '@/lib/cn'
import { requirePrintAdmin } from '@/features/impressions/access'
import { PrintAdminError } from '@/features/impressions/client'
import { formatCentralDate } from '@/features/impressions/format'
import { soldesSuccessifs } from '@/features/impressions/credit-historique'
import { getCreditAccount } from '@/features/impressions/queries'
import type { CreditMovement } from '@/features/impressions/types'

export const metadata: Metadata = {
  title: 'Historique du compte',
}

/** Libellé et couleur de chaque type de mouvement. */
const MOUVEMENTS: Record<CreditMovement['reason'], { label: string; classe: string }> = {
  TOPUP: { label: 'Recharge', classe: 'bg-emerald-500/10 text-emerald-700' },
  PRINT: { label: 'Impression', classe: 'bg-primary/10 text-primary' },
  REFUND: { label: 'Remboursement', classe: 'bg-amber-500/10 text-amber-700' },
  ADJUST: { label: 'Correction', classe: 'bg-muted text-muted-foreground' },
}


async function Historique({ email }: { email: string }) {
  await requirePrintAdmin()

  let compte
  try {
    compte = await getCreditAccount(email)
  } catch (error) {
    const message =
      error instanceof PrintAdminError ? error.message : 'Lecture impossible.'
    return (
      <div className="surface-card border-destructive/30 bg-destructive/5 p-6">
        <p className="font-medium text-destructive">{message}</p>
      </div>
    )
  }

  const soldes = soldesSuccessifs(compte.mouvements, compte.pages_balance)
  const recharge = compte.mouvements
    .filter((m) => m.pages > 0)
    .reduce((n, m) => n + m.pages, 0)
  const consomme = compte.mouvements
    .filter((m) => m.pages < 0)
    .reduce((n, m) => n - m.pages, 0)

  return (
    <div className="space-y-6">
      <div className="surface-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-bold break-all">{compte.email}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {compte.label ?? 'Sans intitulé'} · ouvert le{' '}
              {formatCentralDate(compte.created_at)}
            </p>
          </div>
          <span
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-lg font-extrabold',
              compte.pages_balance <= 0
                ? 'bg-destructive/10 text-destructive'
                : 'bg-emerald-500/10 text-emerald-700',
            )}
          >
            <Wallet className="h-5 w-5" aria-hidden />
            {compte.pages_balance} page{Math.abs(compte.pages_balance) > 1 ? 's' : ''}
          </span>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border text-center sm:grid-cols-4">
          {[
            ['Rechargé', recharge],
            ['Consommé', consomme],
            ['Mouvements', compte.mouvements.length],
            ['État', compte.active ? 'Actif' : 'Suspendu'],
          ].map(([label, valeur]) => (
            <div key={String(label)} className="bg-card px-2 py-3">
              <dt className="text-[11px] text-muted-foreground">{label}</dt>
              <dd className="font-display text-lg font-bold">{valeur}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="surface-card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-secondary/60 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Mouvement</th>
              <th className="px-4 py-3 text-right font-medium">Pages</th>
              <th className="px-4 py-3 text-right font-medium">Solde après</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">Note</th>
              <th className="hidden px-4 py-3 font-medium lg:table-cell">Référence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {compte.mouvements.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  Aucun mouvement sur ce compte.
                </td>
              </tr>
            )}

            {compte.mouvements.map((mouvement, index) => {
              const type = MOUVEMENTS[mouvement.reason] ?? {
                label: mouvement.reason,
                classe: 'bg-muted text-muted-foreground',
              }
              return (
                <tr key={`${mouvement.created_at}-${index}`}>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatCentralDate(mouvement.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                        type.classe,
                      )}
                    >
                      {type.label}
                    </span>
                  </td>
                  <td
                    className={cn(
                      'px-4 py-3 text-right font-medium',
                      mouvement.pages > 0 ? 'text-emerald-700' : 'text-foreground',
                    )}
                  >
                    {mouvement.pages > 0 ? '+' : ''}
                    {mouvement.pages}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {soldes[index]}
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                    {mouvement.note ?? '—'}
                  </td>
                  <td className="hidden px-4 py-3 font-mono text-xs text-muted-foreground lg:table-cell">
                    {mouvement.reference ?? '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Le solde est en pages noir &amp; blanc : une page couleur en consomme davantage, dans le
        rapport de vos tarifs. La colonne
        « Solde après » est reconstituée depuis le solde actuel, en remontant les mouvements.
      </p>
    </div>
  )
}

export default async function HistoriqueCreditPage({
  params,
}: {
  params: Promise<{ email: string }>
}) {
  const { email } = await params
  const adresse = decodeURIComponent(email)

  return (
    <div className="space-y-6">
      <Link
        href="/admin/impressions/credits"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Retour aux comptes à crédit
      </Link>

      <header>
        <h1 className="font-display text-2xl font-extrabold sm:text-3xl">
          Historique du compte
        </h1>
        <p className="mt-1 text-sm break-all text-muted-foreground">{adresse}</p>
      </header>

      <Suspense fallback={<CardsSkeleton />}>
        <Historique email={adresse} />
      </Suspense>
    </div>
  )
}
