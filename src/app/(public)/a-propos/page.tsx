import type { Metadata } from 'next'

import { CtaBand } from '@/components/cta-band'

export const metadata: Metadata = {
  title: 'À propos — MaSoft Consulting, partenaire agréé Sharp',
  description:
    'Campus Print est développé par MaSoft Consulting, partenaire agréé Sharp et expert en solutions IT au Togo.',
}

const CARDS = [
  {
    title: 'Partenaire agréé Sharp',
    text: "Nous déployons des photocopieurs multifonctions Sharp, reconnus pour leur robustesse et leur qualité d'impression.",
  },
  {
    title: 'Fiabilité garantie',
    text: 'Matériel supervisé à distance, consommables suivis, interventions rapides en cas de panne.',
  },
  {
    title: 'Maintenance de proximité',
    text: 'Des techniciens formés, basés au Togo, qui interviennent directement sur les campus.',
  },
  {
    title: 'Pensé pour les étudiants',
    text: 'Un service simple, mobile-first et abordable, conçu avec les usages réels des campus.',
  },
]

export default function AProposPage() {
  return (
    <>
      <section className="bg-[image:var(--gradient-hero)] text-primary-foreground">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
          <span className="text-sm font-semibold opacity-90">À propos</span>
          <h1 className="mt-2 font-display text-3xl font-extrabold sm:text-5xl">
            Campus Print, une initiative MaSoft Consulting
          </h1>
          <p className="mt-4 max-w-2xl opacity-85">
            Expert en solutions IT et partenaire agréé Sharp, MaSoft Consulting accompagne
            entreprises et institutions au Togo.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 text-muted-foreground">
        <p>
          MaSoft Consulting conçoit et opère des infrastructures d&apos;impression et des solutions
          informatiques pour les organisations togolaises. Campus Print est né d&apos;un constat
          simple : imprimer un cours ou un mémoire reste long, cher et compliqué pour les étudiants.
          Nous avons donc rapproché l&apos;impression de là où ils étudient, avec un paiement
          qu&apos;ils utilisent déjà tous les jours : le Mobile Money.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="grid gap-4 sm:grid-cols-2">
          {CARDS.map((card) => (
            <div key={card.title} className="surface-card p-6">
              <h2 className="font-display text-lg font-bold">{card.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{card.text}</p>
            </div>
          ))}
        </div>
      </section>

      <CtaBand />
      <div className="pb-4" />
    </>
  )
}
