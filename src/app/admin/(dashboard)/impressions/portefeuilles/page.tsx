import { Suspense } from 'react'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowLeft, Info } from 'lucide-react'

import { CardsSkeleton } from '@/components/ui/skeletons'
import { requirePrintAdmin } from '@/features/impressions/access'
import { PrintAdminError } from '@/features/impressions/client'
import { WalletRow } from '@/features/impressions/components/wallets-manager'
import { formatMontant } from '@/features/impressions/format'
import { getWallets } from '@/features/impressions/queries'

export const metadata: Metadata = {
  title: 'Portefeuilles PrintPoint',
}

async function WalletsList() {
  await requirePrintAdmin()

  let data
  try {
    data = await getWallets()
  } catch (error) {
    const message = error instanceof PrintAdminError ? error.message : 'Lecture impossible.'
    return (
      <div className="surface-card border-destructive/30 bg-destructive/5 p-6">
        <p className="font-medium text-destructive">{message}</p>
      </div>
    )
  }

  const { portefeuilles, total_du, montants_de_recharge } = data
  const devise = portefeuilles[0]?.currency ?? ''
  const actifs = portefeuilles.filter((p) => p.balance > 0).length

  return (
    <div className="space-y-6">
      {portefeuilles.length === 0 ? (
        <div className="surface-card p-6 text-sm text-muted-foreground">
          Aucun portefeuille ouvert. Un portefeuille naît à la première recharge, jamais avant —
          il n&apos;y a donc rien à créer ici.
        </div>
      ) : (
        <>
          <div className="surface-card bg-secondary/40 p-6 text-sm">
            <p className="font-medium">
              {portefeuilles.length} portefeuille{portefeuilles.length > 1 ? 's' : ''} ·{' '}
              {actifs} avec du solde · {formatMontant(total_du, devise)} dus
            </p>
            <p className="mt-1 text-muted-foreground">
              Ce total est une <strong>dette envers les clients</strong> : de l&apos;argent déjà
              encaissé pour des pages qui ne sont pas encore sorties.
            </p>
          </div>

          <div className="grid items-start gap-4 lg:grid-cols-2">
            {portefeuilles.map((wallet) => (
              <WalletRow key={wallet.email} wallet={wallet} />
            ))}
          </div>
        </>
      )}

      {montants_de_recharge.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Montants de recharge proposés aux clients :{' '}
          {montants_de_recharge.map((m) => formatMontant(m, devise)).join(' · ')}. Réglés par la
          centrale (<span className="font-mono">WALLET_TOPUP_AMOUNTS</span>), pas depuis cet
          écran.
        </p>
      )}
    </div>
  )
}

export default function PortefeuillesPage() {
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
        <h1 className="font-display text-2xl font-extrabold sm:text-3xl">
          Portefeuilles PrintPoint
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Des clients qui rechargent un solde en ligne, puis impriment en le consommant à
          l&apos;unité. À ne pas confondre avec les{' '}
          <Link
            href="/admin/impressions/credits"
            className="font-medium text-primary hover:underline"
          >
            comptes à crédit
          </Link>
          , qui sont en pages et que vous rechargez vous-même.
        </p>
      </header>

      <div className="surface-card border-primary/20 bg-primary/5 p-6 text-sm">
        <p className="flex items-center gap-2 font-medium">
          <Info className="h-4 w-4 text-primary" aria-hidden />
          Trois choses à savoir
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
          <li>
            <strong>Vous ne rechargez pas à la place du client.</strong> Une recharge est un
            paiement Mobile Money, et c&apos;est la seule transaction du parcours : les
            impressions suivantes sont de simples débits du solde. Pour une recharge encaissée en
            espèces au comptoir, utilisez un ajustement — il exige un motif, qui restera dans
            l&apos;historique.
          </li>
          <li>
            Quand un client a <strong>les deux</strong>, le crédit en pages est consommé en
            premier : il a été acheté pour cela, alors que l&apos;argent du portefeuille reste
            disponible pour autre chose.
          </li>
          <li>
            Si le solde ne couvre pas une impression, le client <strong>paie normalement</strong>{' '}
            la totalité, et son solde reste intact. Un code qui expire sans impression{' '}
            <strong>rend l&apos;argent</strong>. Le solde, lui, ne périme pas.
          </li>
        </ul>
      </div>

      <Suspense fallback={<CardsSkeleton />}>
        <WalletsList />
      </Suspense>
    </div>
  )
}
