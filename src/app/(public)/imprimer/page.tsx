import type { Metadata } from 'next'

import { PrintFlow } from '@/features/impression/components/print-flow'

export const metadata: Metadata = {
  title: 'Imprimer un document',
  description:
    'Envoyez vos documents depuis votre téléphone, payez en Mobile Money et récupérez vos impressions sur la borne Campus Print de votre campus.',
}

export default function ImprimerPage() {
  return (
    <>
      <section className="bg-[image:var(--gradient-hero)] text-primary-foreground">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:py-16">
          <span className="text-sm font-semibold opacity-90">Impression</span>
          <h1 className="mt-2 font-display text-3xl font-extrabold sm:text-5xl">
            Imprimer un document
          </h1>
          <p className="mt-4 max-w-xl opacity-85">
            Trois minutes, sans application à installer : votre téléphone envoie les fichiers,
            la borne les imprime.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <PrintFlow />
      </section>
    </>
  )
}
