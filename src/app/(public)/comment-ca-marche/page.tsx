import type { Metadata } from 'next'
import { CreditCard, MapPin, Send, Settings2 } from 'lucide-react'

import { CtaBand } from '@/components/cta-band'
import { FaqAccordion, type FaqItem } from '@/components/faq-accordion'
import { ButtonLink } from '@/components/ui/button-link'

export const metadata: Metadata = {
  title: 'Comment ça marche',
  description:
    'Envoyez, choisissez vos options, payez en Mobile Money et récupérez votre impression sur votre campus. Les 4 étapes détaillées.',
}

const STEPS = [
  {
    Icon: Send,
    title: 'Envoyez votre document',
    text: "Depuis votre téléphone ou votre ordinateur, envoyez un PDF, un fichier Word, un PowerPoint ou une simple photo. Aucune application à installer.",
    items: ['PDF, DOCX, PPTX, JPG, PNG', "Jusqu'à 50 Mo par envoi", 'Pas de compte à créer'],
  },
  {
    Icon: Settings2,
    title: 'Choisissez vos options',
    text: "Nombre de pages, noir & blanc ou couleur, recto/verso, nombre de copies. Le prix s'affiche immédiatement.",
    items: ['N&B ou couleur', 'Recto ou recto/verso', 'Copies multiples'],
  },
  {
    Icon: CreditCard,
    title: 'Payez en Mobile Money',
    text: "Validez votre paiement via Flooz, T-Money/Mixx ou votre carte prépayée Campus Print. Vous recevez un code de retrait.",
    items: ['Flooz', 'T-Money / Mixx', 'Carte prépayée Campus Print'],
  },
  {
    Icon: MapPin,
    title: 'Récupérez votre impression',
    text: "Rendez-vous au point Campus Print de votre campus, saisissez votre code sur la borne Sharp et récupérez vos pages.",
    items: ['Code de retrait valable 24 h', 'Impression en 3 minutes en moyenne'],
  },
]

const FAQ: FaqItem[] = [
  {
    question: 'Quels formats de fichiers sont acceptés ?',
    answer: "PDF, DOCX, PPTX, JPG et PNG, jusqu'à 50 Mo par envoi.",
  },
  {
    question: 'Mes documents sont-ils en sécurité ?',
    answer: 'Oui, vos fichiers sont supprimés automatiquement 24 heures après leur envoi.',
  },
  {
    question: 'Quels moyens de paiement puis-je utiliser ?',
    answer: 'Flooz, T-Money/Mixx, ou la carte prépayée Campus Print.',
  },
  {
    question: 'Faut-il créer un compte ?',
    answer: "Non, aucun compte n'est nécessaire pour imprimer un document.",
  },
]

export default function CommentCaMarchePage() {
  return (
    <>
      <section className="bg-[image:var(--gradient-hero)] text-primary-foreground">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
          <span className="text-sm font-semibold opacity-90">Mode d&apos;emploi</span>
          <h1 className="mt-2 font-display text-3xl font-extrabold sm:text-5xl">
            De votre téléphone à la borne, en 4 étapes
          </h1>
          <p className="mt-4 max-w-xl opacity-85">
            Un parcours pensé pour aller vite entre deux cours.
          </p>
          <ButtonLink href="/tarifs" className="mt-6">
            Imprimer un document
          </ButtonLink>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className="space-y-10">
          {STEPS.map(({ Icon, title, text, items }, index) => (
            <div
              key={title}
              className="surface-card grid gap-6 p-6 sm:p-8 lg:grid-cols-[auto_1fr] lg:items-start"
            >
              <div className="flex items-center gap-4 lg:flex-col lg:items-start">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="h-6 w-6" aria-hidden />
                </span>
                <span className="text-sm font-semibold text-muted-foreground">
                  Étape {index + 1}
                </span>
              </div>
              <div>
                <h2 className="font-display text-xl font-bold sm:text-2xl">{title}</h2>
                <p className="mt-2 text-muted-foreground">{text}</p>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {items.map((item) => (
                    <li
                      key={item}
                      className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-16">
        <h2 className="text-center font-display text-2xl font-bold sm:text-3xl">
          Questions fréquentes
        </h2>
        <FaqAccordion items={FAQ} />
      </section>

      <CtaBand />
      <div className="pb-4" />
    </>
  )
}
