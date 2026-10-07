import { Suspense } from 'react'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowLeft, Info } from 'lucide-react'

import { CardsSkeleton } from '@/components/ui/skeletons'
import { requirePrintAdmin } from '@/features/impressions/access'
import { PrintAdminError } from '@/features/impressions/client'
import {
  CreateCreditForm,
  CreditRow,
} from '@/features/impressions/components/credits-manager'
import { getCreditAccounts } from '@/features/impressions/queries'

export const metadata: Metadata = {
  title: 'Comptes à crédit',
}

async function CreditsList() {
  await requirePrintAdmin()

  let comptes
  try {
    comptes = await getCreditAccounts()
  } catch (error) {
    const message = error instanceof PrintAdminError ? error.message : 'Lecture impossible.'
    return (
      <div className="surface-card border-destructive/30 bg-destructive/5 p-6">
        <p className="font-medium text-destructive">{message}</p>
      </div>
    )
  }

  const total = comptes.reduce((n, c) => n + c.pages_balance, 0)
  const epuises = comptes.filter((c) => c.active && c.pages_balance <= 0).length

  return (
    <div className="space-y-6">
      <CreateCreditForm />

      {comptes.length === 0 ? (
        <div className="surface-card p-6 text-sm text-muted-foreground">
          Aucun compte à crédit. Tous les clients paient avant d&apos;imprimer.
        </div>
      ) : (
        <>
          <div className="surface-card bg-secondary/40 p-6 text-sm">
            <p className="font-medium">
              {comptes.length} compte{comptes.length > 1 ? 's' : ''} ·{' '}
              {total.toLocaleString('fr-FR')} page{total > 1 ? 's' : ''} en circulation
            </p>
            {epuises > 0 && (
              <p className="mt-1 text-destructive">
                {epuises} compte{epuises > 1 ? 's' : ''} à solde épuisé — il
                {epuises > 1 ? 's' : ''} paie{epuises > 1 ? 'nt' : ''} normalement en attendant
                une recharge.
              </p>
            )}
          </div>

          <div className="grid items-start gap-4 lg:grid-cols-2">
            {comptes.map((compte) => (
              <CreditRow key={compte.email} account={compte} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function CreditsPage() {
  return (
    <div className="space-y-6">
      <Link
        href="/admin/impressions"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Retour aux impressions
      </Link>

      <header>
        <h1 className="font-display text-2xl font-extrabold sm:text-3xl">Comptes à crédit</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Des adresses qui impriment sans payer, sur un lot de pages acheté d&apos;avance. Tous
          les autres clients continuent de payer avant d&apos;imprimer.
        </p>
      </header>

      <div className="surface-card border-primary/20 bg-primary/5 p-6 text-sm">
        <p className="flex items-center gap-2 font-medium">
          <Info className="h-4 w-4 text-primary" aria-hidden />
          Trois choses à savoir
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
          <li>
            Le solde est en <strong>pages noir &amp; blanc</strong>. Une page couleur en consomme
            2, dans le rapport des tarifs en vigueur.
          </li>
          <li>
            <strong>Le code de retrait n&apos;est pas affiché à l&apos;écran</strong> pour ces
            comptes : il part uniquement par e-mail. L&apos;adresse n&apos;étant pas vérifiée,
            c&apos;est ce qui empêche un tiers de consommer le solde depuis la borne.
          </li>
          <li>
            Si le solde ne couvre pas une impression, le client <strong>paie normalement</strong>{' '}
            la totalité, et le crédit reste intact. Un code qui expire sans impression{' '}
            <strong>rend les pages</strong>.
          </li>
        </ul>
      </div>

      <Suspense fallback={<CardsSkeleton />}>
        <CreditsList />
      </Suspense>
    </div>
  )
}
