import type { Metadata } from 'next'
import Link from 'next/link'
import { Printer, Wallet } from 'lucide-react'

import { RechargeForm } from '@/features/impression/components/recharge-form'
import { getPricing } from '@/features/settings/queries'
import { MARQUE } from '@/lib/marque'
import { Suspense } from 'react'
import { PrixDePage } from '@/features/devise/components/devise-serveur'

export const metadata: Metadata = {
  title: 'Recharger mon portefeuille',
  description:
    `Créditez votre portefeuille ${MARQUE.nom}, puis imprimez à l’unité sans repasser par un paiement à chaque fois.`,
}

/**
 * Recharge autonome, sans document à envoyer.
 *
 * Jusqu'ici le portefeuille ne se rechargeait qu'au moment où le solde
 * manquait, au milieu du parcours d'impression : impossible de préparer son
 * compte à l'avance, ni de créditer celui de quelqu'un d'autre.
 */
export default async function RechargePage() {
  const pricing = await getPricing()

  return (
    <>
      <section className="bg-[image:var(--gradient-hero)] text-primary-foreground">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:py-16">
          <span className="text-sm font-semibold opacity-90">Portefeuille</span>
          <h1 className="mt-2 font-display text-3xl font-extrabold sm:text-5xl">
            Recharger mon portefeuille
          </h1>
          <p className="mt-4 max-w-xl opacity-85">
            Un seul paiement, puis vos impressions sont débitées à l&apos;unité — sans
            repasser par Mobile Money à chaque fois.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <RechargeForm />

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            ['Un seul paiement', 'Vous rechargez une fois, vous imprimez autant de fois.'],
            ['Le solde ne périme pas', 'Il reste disponible tant que vous ne l’avez pas consommé.'],
            [
              'Pour quelqu’un d’autre',
              'Saisissez son adresse : le solde est crédité à ce compte-là.',
            ],
          ].map(([titre, texte]) => (
            <div key={titre} className="surface-card p-5">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Wallet className="h-4 w-4 text-primary" aria-hidden />
                {titre}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{texte}</p>
            </div>
          ))}
        </div>

        <div className="surface-card mt-8 p-6 sm:p-8">
          <h2 className="font-display text-lg font-bold">Comment ça se dépense</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Au moment d&apos;imprimer, saisissez la même adresse : le montant est déduit de
            votre solde, et votre code de retrait vous est envoyé par e-mail. Une page noir
            &amp; blanc coûte{' '}
            <Suspense fallback={`${pricing.nb} F CFA`}>
              <PrixDePage grille={pricing} type="mono" />
            </Suspense>
            , une page couleur{' '}
            <Suspense fallback={`${pricing.couleur} F CFA`}>
              <PrixDePage grille={pricing} type="couleur" />
            </Suspense>
            , et une page A3 compte double.
          </p>
          <Link
            href="/imprimer"
            className="mt-5 inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border px-6 text-sm font-medium transition-colors hover:bg-accent"
          >
            <Printer className="h-4 w-4" aria-hidden />
            Imprimer un document
          </Link>
        </div>
      </section>
    </>
  )
}
