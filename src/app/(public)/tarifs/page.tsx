import type { Metadata } from 'next'

import { CtaBand } from '@/components/cta-band'
import { FaqAccordion } from '@/components/faq-accordion'
import { getFaqForPage } from '@/features/faq/queries'
import { PriceCalculator } from '@/components/price-calculator'
import { getPricing, getRechargeAmounts } from '@/features/settings/queries'

export async function generateMetadata(): Promise<Metadata> {
  const pricing = await getPricing()
  return {
    title: `Tarifs — ${pricing.nb} FCFA la page`,
    description: `Noir & blanc à ${pricing.nb} FCFA/page, couleur à ${pricing.couleur} FCFA/page. Sans abonnement : vous payez uniquement ce que vous imprimez.`,
  }
}

const numberFormatter = new Intl.NumberFormat('fr-FR')

export default async function TarifsPage() {
  const [pricing, rechargeAmounts, faq] = await Promise.all([
    getPricing(),
    getRechargeAmounts(),
    getFaqForPage('tarifs'),
  ])


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

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="surface-card p-8">
            <h2 className="font-display text-xl font-bold">Noir &amp; Blanc</h2>
            <p className="mt-2">
              <span className="font-display text-4xl font-extrabold text-primary">
                {pricing.nb}
              </span>{' '}
              <span className="text-muted-foreground">FCFA / page</span>
            </p>
            <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
              <li>✓ Recto ou recto/verso</li>
              <li>✓ Formats A4</li>
              <li>✓ Qualité laser Sharp</li>
            </ul>
          </div>
          <div className="surface-card p-8">
            <h2 className="font-display text-xl font-bold">Couleur</h2>
            <p className="mt-2">
              <span className="font-display text-4xl font-extrabold text-primary">
                {pricing.couleur}
              </span>{' '}
              <span className="text-muted-foreground">FCFA / page</span>
            </p>
            <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
              <li>✓ Idéal pour graphiques et présentations</li>
              <li>✓ Formats A4</li>
              <li>✓ Couleurs fidèles</li>
            </ul>
          </div>
        </div>

        <div className="surface-card mt-6 p-8">
          <h2 className="font-display text-xl font-bold">Carte prépayée Campus Print</h2>
          <p className="mt-2 text-muted-foreground">
            Rechargez une fois, imprimez toute la semaine sans repasser par Mobile Money.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {rechargeAmounts.map((amount) => (
              <div key={amount} className="rounded-xl border border-border p-4 text-center">
                <p className="font-display text-2xl font-extrabold">
                  {numberFormatter.format(amount)}
                </p>
                <p className="text-xs text-muted-foreground">FCFA</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="mx-auto max-w-xl">
          <PriceCalculator priceNb={pricing.nb} priceCouleur={pricing.couleur} />
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
