import type { Metadata } from 'next'
import { Printer } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Paiement terminé',
  robots: { index: false, follow: false },
}

/**
 * Page de retour après paiement (`callback_url` transmise à FedaPay).
 *
 * Volontairement purement informative : elle ne déclenche rien et ne lit aucun
 * paramètre d'URL. Le paiement n'est reconnu que par le webhook signé —
 * arriver sur cette adresse ne prouve rien, il suffirait de la taper à la main.
 * Et l'impression n'est jamais lancée d'ici : elle part de la borne, quand le
 * client y saisit son code.
 */
export default function PaiementPage() {
  return (
    <section className="mx-auto max-w-lg px-4 py-16 text-center sm:py-24">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Printer className="h-8 w-8" aria-hidden />
      </span>
      <h1 className="mt-6 font-display text-2xl font-extrabold sm:text-3xl">
        Paiement enregistré
      </h1>
      <p className="mt-3 text-muted-foreground">
        Rendez-vous à la borne Campus Print et saisissez votre code de retrait à 6 chiffres :
        l&apos;impression démarre à ce moment-là, quand vous êtes devant la machine.
      </p>
      <p className="mt-6 text-sm text-muted-foreground">
        Votre code vous a été envoyé par e-mail. Si le paiement n&apos;apparaît pas comme réglé
        sur la borne d&apos;ici quelques minutes, prévenez un responsable du point Campus Print
        en gardant votre référence de paiement sous la main.
      </p>
    </section>
  )
}
