import { Suspense } from 'react'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowLeft, Wallet } from 'lucide-react'

import { CardsSkeleton } from '@/components/ui/skeletons'
import { cn } from '@/lib/cn'
import { requirePrintAdmin } from '@/features/impressions/access'
import { PrintAdminError } from '@/features/impressions/client'
import { formatCentralDate, formatMontant } from '@/features/impressions/format'
import { soldesSuccessifs } from '@/features/impressions/credit-historique'
import { getWallet } from '@/features/impressions/queries'
import type { WalletMovement } from '@/features/impressions/types'

export const metadata: Metadata = {
  title: 'Historique du portefeuille',
}

/**
 * Libellé et couleur de chaque type de mouvement.
 *
 * « Correction » plutôt que « Ajustement » : c'est le mot qu'emploie déjà
 * l'historique des comptes à crédit, et les deux écrans se lisent côte à côte.
 */
const MOUVEMENTS: Record<WalletMovement['reason'], { label: string; classe: string }> = {
  TOPUP: { label: 'Recharge', classe: 'bg-emerald-500/10 text-emerald-700' },
  PRINT: { label: 'Impression', classe: 'bg-primary/10 text-primary' },
  REFUND: { label: 'Remboursement', classe: 'bg-amber-500/10 text-amber-700' },
  ADJUST: { label: 'Correction', classe: 'bg-muted text-muted-foreground' },
}

async function Historique({ email }: { email: string }) {
  await requirePrintAdmin()

  let portefeuille
  try {
    portefeuille = await getWallet(email)
  } catch (error) {
    const message = error instanceof PrintAdminError ? error.message : 'Lecture impossible.'
    return (
      <div className="surface-card border-destructive/30 bg-destructive/5 p-6">
        <p className="font-medium text-destructive">{message}</p>
      </div>
    )
  }

  const { currency } = portefeuille
  const soldes = soldesSuccessifs(
    portefeuille.mouvements.map((m) => m.amount),
    portefeuille.balance,
  )

  // Seules les vraies recharges comptent comme encaissées : un remboursement
  // et une correction sont aussi des mouvements positifs, mais rien n'est
  // rentré en caisse. Les additionner gonflerait le chiffre affiché.
  const recharge = portefeuille.mouvements
    .filter((m) => m.reason === 'TOPUP')
    .reduce((n, m) => n + m.amount, 0)
  const imprime = portefeuille.mouvements
    .filter((m) => m.reason === 'PRINT')
    .reduce((n, m) => n - m.amount, 0)
  const rembourse = portefeuille.mouvements
    .filter((m) => m.reason === 'REFUND')
    .reduce((n, m) => n + m.amount, 0)

  return (
    <div className="space-y-6">
      <div className="surface-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-bold break-all">{portefeuille.email}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              ouvert le {formatCentralDate(portefeuille.created_at)} · dernier mouvement le{' '}
              {formatCentralDate(portefeuille.updated_at)}
            </p>
          </div>
          <span
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-lg font-extrabold',
              portefeuille.balance <= 0
                ? 'bg-muted text-muted-foreground'
                : 'bg-emerald-500/10 text-emerald-700',
            )}
          >
            <Wallet className="h-5 w-5" aria-hidden />
            {formatMontant(portefeuille.balance, currency)}
          </span>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border text-center sm:grid-cols-4">
          {[
            ['Rechargé', formatMontant(recharge, currency)],
            ['Imprimé', formatMontant(imprime, currency)],
            ['Remboursé', formatMontant(rembourse, currency)],
            ['Mouvements', String(portefeuille.mouvements.length)],
          ].map(([label, valeur]) => (
            <div key={label} className="bg-card px-2 py-3">
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
              <th className="px-4 py-3 text-right font-medium">Montant</th>
              <th className="px-4 py-3 text-right font-medium">Solde après</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">Motif</th>
              <th className="hidden px-4 py-3 font-medium lg:table-cell">Référence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {portefeuille.mouvements.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  Aucun mouvement sur ce portefeuille.
                </td>
              </tr>
            )}

            {portefeuille.mouvements.map((mouvement, index) => {
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
                      mouvement.amount > 0 ? 'text-emerald-700' : 'text-foreground',
                    )}
                  >
                    {mouvement.amount > 0 ? '+' : ''}
                    {formatMontant(mouvement.amount, currency)}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {formatMontant(soldes[index], currency)}
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
        Une « Correction » n&apos;a aucun paiement derrière elle : son motif est la seule trace
        de ce geste, d&apos;où son caractère obligatoire. La colonne « Solde après » est
        reconstituée depuis le solde actuel, en remontant les mouvements.
      </p>
    </div>
  )
}

export default async function HistoriquePortefeuillePage({
  params,
}: {
  params: Promise<{ email: string }>
}) {
  const { email } = await params
  const adresse = decodeURIComponent(email)

  return (
    <div className="space-y-6">
      <Link
        href="/admin/impressions/portefeuilles"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Retour aux portefeuilles
      </Link>

      <header>
        <h1 className="font-display text-2xl font-extrabold sm:text-3xl">
          Historique du portefeuille
        </h1>
        <p className="mt-1 text-sm break-all text-muted-foreground">{adresse}</p>
      </header>

      <Suspense fallback={<CardsSkeleton />}>
        <Historique email={adresse} />
      </Suspense>
    </div>
  )
}
