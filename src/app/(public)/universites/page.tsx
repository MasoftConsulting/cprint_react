import type { Metadata } from 'next'

import { ButtonLink } from '@/components/ui/button-link'

export const metadata: Metadata = {
  title: 'Pour les universités — Devenir campus partenaire',
  description:
    "Aucun investissement initial, partage des revenus, service gratuit pour l'établissement et tableau de bord de suivi dédié.",
}

const CARDS = [
  {
    title: 'Aucun investissement initial',
    text: "MaSoft Consulting finance, installe et entretient le matériel Sharp. L'établissement ne débourse rien.",
  },
  {
    title: 'Partage des revenus',
    text: "Une part du chiffre d'affaires généré par la borne revient à l'établissement, versée chaque mois.",
  },
  {
    title: 'Un service moderne et gratuit',
    text: "Vos étudiants gagnent un service d'impression rapide et accessible, sans coût pour l'université.",
  },
  {
    title: 'Maintenance incluse',
    text: 'Consommables, dépannage et supervision technique assurés par nos équipes agréées Sharp.',
  },
  {
    title: 'Tableau de bord dédié',
    text: "Un accès en ligne réservé à l'établissement pour suivre l'activité de la borne.",
  },
]

const PARTNER_STEPS = [
  'Prise de contact et étude du campus',
  'Signature de la convention de partenariat',
  'Installation de la borne et formation',
  'Lancement auprès des étudiants',
]

export default function UniversitesPage() {
  return (
    <>
      <section className="bg-[image:var(--gradient-hero)] text-primary-foreground">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
          <span className="text-sm font-semibold opacity-90">Pour les universités</span>
          <h1 className="mt-2 max-w-3xl font-display text-3xl font-extrabold sm:text-5xl">
            Offrez l&apos;impression moderne à vos étudiants, sans rien investir
          </h1>
          <p className="mt-4 max-w-xl opacity-85">
            Campus Print s&apos;installe sur votre campus, s&apos;entretient tout seul et vous
            reverse une part des revenus.
          </p>
          <ButtonLink href="/contact" className="mt-6">
            Devenir campus partenaire
          </ButtonLink>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CARDS.map((card) => (
            <div key={card.title} className="surface-card p-6">
              <h2 className="font-display text-lg font-bold">{card.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{card.text}</p>
            </div>
          ))}

          <div className="surface-card p-6">
            <h2 className="font-display text-lg font-bold">Tableau de bord — le détail</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>✓ Volume d&apos;impressions par jour et par mois</li>
              <li>✓ Revenus générés et part reversée</li>
              <li>✓ État du matériel et alertes consommables</li>
              <li>✓ Export des rapports en un clic</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <h2 className="text-center font-display text-2xl font-bold sm:text-3xl">
          Comment devenir partenaire
        </h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PARTNER_STEPS.map((step, index) => (
            <div key={step} className="text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 font-display text-lg font-bold text-primary">
                {index + 1}
              </span>
              <p className="mt-3 text-sm font-medium">{step}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 text-center">
          <ButtonLink href="/contact">Prendre contact</ButtonLink>
        </div>
      </section>
    </>
  )
}
