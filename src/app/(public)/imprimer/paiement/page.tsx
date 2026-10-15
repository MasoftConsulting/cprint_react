import { Suspense } from 'react'
import type { Metadata } from 'next'
import { Loader2 } from 'lucide-react'

import { RetourPaiementDepuisUrl } from '@/features/impression/components/retour-paiement'

export const metadata: Metadata = {
  title: 'Retour de paiement',
  robots: { index: false, follow: false },
}

/**
 * Page de retour après paiement (`callback_url` transmise à FedaPay).
 *
 * Elle ne déclenche rien et n'accorde rien : arriver ici ne prouve pas qu'on a
 * payé, il suffirait de taper l'adresse à la main. Seul le webhook signé fait
 * foi, et l'impression ne part jamais d'ici — elle part de la borne, quand le
 * client y saisit son code.
 *
 * Elle *lit* en revanche le statut réel auprès de la centrale, à partir de la
 * référence que celle-ci a mise dans l'URL. Avant, elle annonçait « Paiement
 * enregistré » à tout le monde : un client qui venait d'annuler repartait
 * convaincu d'avoir payé et se présentait à la borne sans code.
 */
export default function PaiementPage() {
  return (
    <Suspense
      fallback={
        <section className="mx-auto max-w-lg px-4 py-16 text-center sm:py-24">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" aria-hidden />
        </section>
      }
    >
      <RetourPaiementDepuisUrl nature="PRINT" />
    </Suspense>
  )
}
