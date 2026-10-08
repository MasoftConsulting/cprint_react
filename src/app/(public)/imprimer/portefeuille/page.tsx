import type { Metadata } from 'next'
import { Wallet } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Recharge enregistrée',
  robots: { index: false, follow: false },
}

/**
 * Page de retour après une recharge du portefeuille PrintPoint
 * (`callback_url` transmise à FedaPay par `POST /payments/topup`).
 *
 * Volontairement purement informative, comme la page de retour de paiement :
 * elle ne crédite rien et ne lit aucun paramètre d'URL. **Le solde n'est
 * crédité que par le webhook signé** — arriver ici ne prouve rien, il
 * suffirait de taper l'adresse à la main pour se créditer gratuitement.
 *
 * L'onglet du parcours d'impression, lui, continue d'interroger la centrale
 * et reprend tout seul dès que la recharge est confirmée.
 */
export default function PortefeuillePage() {
  return (
    <section className="mx-auto max-w-lg px-4 py-16 text-center sm:py-24">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Wallet className="h-8 w-8" aria-hidden />
      </span>
      <h1 className="mt-6 font-display text-2xl font-extrabold sm:text-3xl">
        Recharge enregistrée
      </h1>
      <p className="mt-3 text-muted-foreground">
        Votre solde est crédité dès la confirmation du paiement. Revenez sur l&apos;onglet
        Campus Print resté ouvert : il reprend tout seul, avec votre nouveau solde.
      </p>
      <p className="mt-6 text-sm text-muted-foreground">
        Ce solde ne périme pas. Vos prochaines impressions en seront débitées à l&apos;unité,
        sans repasser par un paiement mobile à chaque fois.
      </p>
    </section>
  )
}
