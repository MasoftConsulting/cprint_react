import { Suspense } from 'react'
import type { Metadata } from 'next'
import { Loader2 } from 'lucide-react'

import { RetourPaiementDepuisUrl } from '@/features/impression/components/retour-paiement'

export const metadata: Metadata = {
  title: 'Retour de recharge',
  robots: { index: false, follow: false },
}

/**
 * Page de retour après une recharge du portefeuille PrintPoint
 * (`callback_url` transmise à FedaPay par `POST /payments/topup`).
 *
 * Elle ne crédite rien : **le solde n'est crédité que par le webhook signé**,
 * sans quoi il suffirait de taper cette adresse pour se créditer gratuitement.
 * Elle se contente d'aller lire, auprès de la centrale, l'état réel de la
 * recharge dont la référence figure dans l'URL — plutôt que d'annoncer
 * « Recharge enregistrée » même à qui vient d'annuler.
 */
export default function PortefeuillePage() {
  return (
    <Suspense
      fallback={
        <section className="mx-auto max-w-lg px-4 py-16 text-center sm:py-24">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" aria-hidden />
        </section>
      }
    >
      <RetourPaiementDepuisUrl nature="TOPUP" />
    </Suspense>
  )
}
