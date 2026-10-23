import { Suspense } from 'react'
import type { Metadata } from 'next'

import { CtaBand } from '@/components/cta-band'
import { FaqAccordion } from '@/components/faq-accordion'
import { getFaqForPage } from '@/features/faq/queries'
import { PriceCalculator } from '@/components/price-calculator'
import { AvecDevise } from '@/features/devise/components/devise-serveur'
import {
  afficher,
  DEVISE_PAR_DEFAUT,
  paliersDeRecharge,
  prixDeZone,
  type Devise,
  type GrilleTarifaire,
} from '@/features/devise/devise'
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
  pricing: GrilleTarifaire
  recharges: number[]
  /** Paliers de la zone euro, en euros ; vide tant qu'ils ne sont pas saisis. */
  rechargesEur: number[]
  devise: Devise
}

/**
 * Prix et recharges, dans la devise du visiteur.
 *
 * Les prix affichés sont ceux de SA zone : 0,10 € pour qui lit l'euro, si la
 * zone euro a ses prix ; 10 F CFA pour qui lit le franc CFA. Le prix de
 * l'autre zone est rappelé dessous, parce que c'est le lieu d'impression qui
 * fixe le prix, et qu'un visiteur de Paris peut payer pour Lomé.
 */
function GrilleTarifs({ pricing, recharges, rechargesEur, devise }: Grille) {
  const zone = prixDeZone(pricing, devise)
  const autre = prixDeZone(pricing, devise === 'EUR' ? 'XOF' : 'EUR')
  // Une autre zone n'est à rappeler que si elle a vraiment d'autres prix.
  const autreDistincte = autre.devise !== zone.devise
  const carte = (titre: string, type: 'mono' | 'couleur', atouts: string[]) => {
    const [nombre, unite] = separer(afficher(zone[type], zone.devise, devise, { unitaire: true }))
    return (
      <div className="surface-card p-8">
        <h2 className="font-display text-xl font-bold">{titre}</h2>
        <p className="mt-2">
          <span className="font-display text-4xl font-extrabold text-primary">{nombre}</span>{' '}
          <span className="text-muted-foreground">{unite} / page</span>
        </p>
        {autreDistincte ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Dans les points {autre.devise === 'EUR' ? 'en euros' : 'en F CFA'} :{' '}
            {afficher(autre[type], autre.devise, autre.devise, { unitaire: true })} la page
          </p>
        ) : (
          zone.devise !== devise && (
            <p className="mt-1 text-xs text-muted-foreground">
              soit {afficher(zone[type], zone.devise, zone.devise, { unitaire: true })} la page
            </p>
          )
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
        {carte('Noir & Blanc', 'mono', ['Recto ou recto/verso', 'Formats A4', 'Qualité laser Sharp'])}
        {carte('Couleur', 'couleur', [
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
          {paliersDeRecharge(recharges, rechargesEur, devise).map((palier) => {
            const [nombre, unite] = separer(afficher(palier.xof, 'XOF', devise))
            return (
              <div
                key={`${palier.zone}-${palier.montant}`}
                className="rounded-xl border border-border p-4 text-center"
              >
                <p className="font-display text-2xl font-extrabold">{nombre}</p>
                <p className="text-xs text-muted-foreground">{unite}</p>
                {/* Un palier F CFA lu en euros : son montant d'origine. Un
                    palier euro n'en a pas d'autre — c'est un montant rond. */}
                {palier.zone === 'XOF' && devise !== 'XOF' && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {afficher(palier.montant, 'XOF', 'XOF')}
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
  const grille = { pricing, recharges: recharge.amounts, rechargesEur: recharge.amountsEur }

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
          <Suspense fallback={<PriceCalculator grille={pricing} />}>
            <AvecDevise>
              {(devise) => (
                <PriceCalculator grille={pricing} devise={devise} />
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
