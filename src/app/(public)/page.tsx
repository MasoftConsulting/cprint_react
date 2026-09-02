import Image from 'next/image'
import { Clock, CreditCard, MapPin, Send, Settings2, ShieldCheck, Smartphone, Zap } from 'lucide-react'

import { CtaBand } from '@/components/cta-band'
import { PriceCalculator } from '@/components/price-calculator'
import { ButtonLink } from '@/components/ui/button-link'
import { getActivePrintPointsCount } from '@/features/print-points/queries'
import { getPricing, getSettings } from '@/features/settings/queries'

const STEPS = [
  {
    Icon: Send,
    num: '01',
    title: 'Envoyez',
    text: 'PDF, Word, PowerPoint ou photo, depuis votre téléphone.',
  },
  {
    Icon: Settings2,
    num: '02',
    title: 'Choisissez',
    text: 'N&B ou couleur, recto/verso, nombre de copies.',
  },
  {
    Icon: Smartphone,
    num: '03',
    title: 'Payez',
    text: 'Flooz, T-Money/Mixx ou carte prépayée Campus Print.',
  },
  {
    Icon: MapPin,
    num: '04',
    title: 'Récupérez',
    text: 'Sur la borne Campus Print de votre campus.',
  },
]

const BENEFITS = [
  { Icon: Clock, text: 'Impression prête en 3 minutes en moyenne' },
  { Icon: CreditCard, text: 'Flooz, T-Money/Mixx ou carte prépayée Campus Print' },
  { Icon: ShieldCheck, text: 'Vos fichiers sont supprimés automatiquement après 24 h' },
]

export default async function HomePage() {
  // Requêtes indépendantes : lancées en parallèle pour éviter la cascade.
  const [activePointsCount, settings, pricing] = await Promise.all([
    getActivePrintPointsCount(),
    getSettings(),
    getPricing(),
  ])

  return (
    <>
      <section className="relative overflow-hidden bg-[image:var(--gradient-hero)] text-primary-foreground">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:py-20 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-semibold">
              <Zap className="h-3.5 w-3.5" aria-hidden />
              Sans application à installer
            </span>
            <h1 className="mt-4 text-4xl leading-[1.05] font-extrabold sm:text-6xl">
              Imprimez vos cours en 3 minutes, sur votre campus.
            </h1>
            <p className="mt-5 max-w-xl text-base opacity-85 sm:text-lg">
              Campus Print est le service d&apos;impression en libre-service des campus togolais :
              envoyez votre document, payez en Mobile Money, récupérez votre impression sur place.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/tarifs">Imprimer un document</ButtonLink>
              <ButtonLink href="/comment-ca-marche" variant="light">
                Comment ça marche
              </ButtonLink>
            </div>
          </div>
          <div className="overflow-hidden rounded-3xl border border-primary-foreground/15 shadow-[var(--shadow-elegant)]">
            <Image
              src="/images/hero-borne.jpg"
              alt="Borne Campus Print équipée d'un photocopieur Sharp sur un campus universitaire"
              width={1600}
              height={1000}
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="h-full w-full object-cover"
            />
          </div>
        </div>

        <div className="border-t border-primary-foreground/15 bg-primary-foreground/5">
          <div className="mx-auto grid max-w-6xl grid-cols-3 divide-x divide-primary-foreground/15 px-4">
            {[
              { value: activePointsCount, label: 'points sur les campus' },
              { value: settings.avg_print_time, label: "temps moyen d'impression" },
              { value: settings.payment_methods_count, label: 'moyens de paiement' },
            ].map((stat) => (
              <div key={stat.label} className="px-2 py-6 text-center">
                <p className="font-display text-2xl font-extrabold sm:text-4xl">{stat.value}</p>
                <p className="mt-1 text-[11px] opacity-80 sm:text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <h2 className="text-center font-display text-2xl font-bold sm:text-3xl">
          Quatre étapes, c&apos;est tout
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
          Pas de compte compliqué, pas d&apos;attente au secrétariat.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ Icon, num, title, text }) => (
            <div key={num} className="surface-card p-6">
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="font-display text-3xl font-extrabold text-border">{num}</span>
              </div>
              <h3 className="mt-4 text-lg font-bold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 text-center">
          <ButtonLink href="/comment-ca-marche" variant="soft" className="h-10 rounded-md text-sm">
            Voir le détail des étapes
          </ButtonLink>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-2xl font-bold sm:text-3xl">
            Vous payez uniquement ce que vous imprimez
          </h2>
          <p className="mt-3 text-muted-foreground">
            {pricing.nb} FCFA la page en noir &amp; blanc, {pricing.couleur} FCFA en couleur. Aucun
            abonnement, aucun frais caché. Simulez votre impression avant de vous déplacer.
          </p>
          <ul className="mt-6 space-y-3 text-sm">
            {BENEFITS.map(({ Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10 text-success">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <PriceCalculator priceNb={pricing.nb} priceCouleur={pricing.couleur} />
      </section>

      <CtaBand />

      <div className="pb-4" />
    </>
  )
}
