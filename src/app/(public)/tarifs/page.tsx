import { Suspense } from 'react'
import type { Metadata } from 'next'

import { CtaBand } from '@/components/cta-band'
import { FaqAccordion } from '@/components/faq-accordion'
import { getFaqForPage } from '@/features/faq/queries'
import { PriceCalculator } from '@/components/price-calculator'
import { AvecDevise } from '@/features/devise/components/devise-serveur'
import { afficher, DEVISE_PAR_DEFAUT, type Devise } from '@/features/devise/devise'
import { getDevise } from '@/features/devise/server'
import { getMontantsRechargeCentrale } from '@/features/impression/queries'
import { getPricing } from '@/features/settings/queries'
import { MARQUE } from '@/lib/marque'

export async function generateMetadata(): Promise<Metadata> {
  const pricing = await getPricing()
  // Les métadonnées sont communes à tous les visiteurs : les deux devises.
  const nb = afficher(pricing.nb, 'XOF', 'EUR', { unitaire: true })
  const couleur = afficher(pricing.couleur, 'XOF', 'EUR', { unitaire: true })
  return {
    title: `Tarifs — ${pricing.nb} F CFA (${nb}) la page`,
    description: `Noir & blanc à ${pricing.nb} F CFA (${nb}) la page, couleur à ${pricing.couleur} F CFA (${couleur}). Sans abonnement : vous payez uniquement ce que vous imprimez.`,
  }
}

/** « 0,015 € » → « 0,015 » et « € » : le nombre en grand, l'unité en petit. */
function separer(texte: string): [string, string] {
  const [nombre, ...unite] = texte.split(' ')
  return [nombre, unite.join(' ')]
}

type Grille = {
  pricing: { nb: number; couleur: number }
  recharges: number[]
  devise: Devise
}

/**
 * Prix et recharges, dans une devise donnée.
 *
 * Les prix sont administrés en F CFA. En euros, ils sont convertis à la parité
 * fixe, et le prix d'origine reste affiché dessous : c'est lui que fixe le
 * tarif, et un client togolais qui lit la page en euros doit pouvoir le
 * retrouver.
 */
function GrilleTarifs({ pricing, recharges, devise }: Grille) {
  const carte = (titre: string, prix: number, atouts: string[]) => {
    const [nombre, unite] = separer(afficher(prix, 'XOF', devise, { unitaire: true }))
    return (
      <div className="surface-card p-8">
        <h2 className="font-display text-xl font-bold">{titre}</h2>
        <p className="mt-2">
          <span className="font-display text-4xl font-extrabold text-primary">{nombre}</span>{' '}
          <span className="text-muted-foreground">{unite} / page</span>
        </p>
        {devise !== 'XOF' && (
          <p className="mt-1 text-xs text-muted-foreground">soit {prix} F CFA la page</p>
        )}
        <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
          {atouts.map((atout) => (
            <li key={atout}>✓ {atout}</li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <div className="grid gap-6 sm:grid-cols-2">
        {carte('Noir & Blanc', pricing.nb, ['Recto ou recto/verso', 'Formats A4', 'Qualité laser Sharp'])}
        {carte('Couleur', pricing.couleur, [
          'Idéal pour graphiques et présentations',
          'Formats A4',
          'Couleurs fidèles',
        ])}
      </div>

      <div className="surface-card mt-6 p-8">
        <h2 className="font-display text-xl font-bold">Carte prépayée {MARQUE.nom}</h2>
        <p className="mt-2 text-muted-foreground">
          Rechargez une fois, imprimez toute la semaine sans repasser par un paiement.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-flow-col sm:grid-cols-none sm:auto-cols-fr">
          {recharges.map((montant) => {
            const [nombre, unite] = separer(afficher(montant, 'XOF', devise))
            return (
              <div key={montant} className="rounded-xl border border-border p-4 text-center">
                <p className="font-display text-2xl font-extrabold">{nombre}</p>
                <p className="text-xs text-muted-foreground">{unite}</p>
                {devise !== 'XOF' && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {afficher(montant, 'XOF', 'XOF')}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/** La grille dans la devise du visiteur : lit la requête, donc sous Suspense. */
async function GrilleTarifsDuVisiteur(props: Omit<Grille, 'devise'>) {
  return <GrilleTarifs {...props} devise={await getDevise()} />
}

export default async function TarifsPage() {
  const [pricing, recharge, faq] = await Promise.all([
    getPricing(),
    getMontantsRechargeCentrale(),
    getFaqForPage('tarifs'),
  ])
  const grille = { pricing, recharges: recharge.amounts }

  return (
    <>
      <section className="bg-[image:var(--gradient-hero)] text-primary-foreground">
        <div className="mx-auto max-w-6xl px-4 py-14 text-center sm:py-20">
          <span className="text-sm font-semibold opacity-90">Tarifs</span>
          <h1 className="mt-2 font-display text-3xl font-extrabold sm:text-5xl">
            Des prix simples, affichés à l&apos;avance
          </h1>
          <p className="mx-auto mt-4 max-w-xl opacity-85">
            Sans abonnement, vous payez uniquement ce que vous imprimez.
          </p>
        </div>
      </section>

      {/* La page reste prérendue ; seuls les montants attendent la devise du
          visiteur, servis dans le même flux. */}
      <Suspense fallback={<GrilleTarifs {...grille} devise={DEVISE_PAR_DEFAUT} />}>
        <GrilleTarifsDuVisiteur {...grille} />
      </Suspense>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="mx-auto max-w-xl">
          <Suspense fallback={<PriceCalculator priceNb={pricing.nb} priceCouleur={pricing.couleur} />}>
            <AvecDevise>
              {(devise) => (
                <PriceCalculator priceNb={pricing.nb} priceCouleur={pricing.couleur} devise={devise} />
              )}
            </AvecDevise>
          </Suspense>
        </div>
      </section>

      {faq.length > 0 && (
        <section className="mx-auto max-w-4xl px-4 pb-16">
          <h2 className="text-center font-display text-2xl font-bold sm:text-3xl">
            Questions fréquentes
          </h2>
          <FaqAccordion items={faq} />
        </section>
      )}

      <CtaBand />
      <div className="pb-4" />
    </>
  )
}
