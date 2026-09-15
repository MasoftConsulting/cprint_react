import { Suspense } from 'react'
import type { Metadata } from 'next'
import { Loader2 } from 'lucide-react'

import { UploadFormFromQuery } from '@/features/impression/components/upload-form'

export const metadata: Metadata = {
  title: 'Envoyer mes documents',
  description: 'Envoyez vos fichiers à imprimer depuis votre téléphone.',
  // Page atteinte en scannant un QR code, propre à une session : rien à
  // indexer, et un moteur qui la suivrait tomberait sur une session expirée.
  robots: { index: false, follow: false },
}

export default function UploadPage() {
  return (
    <section className="mx-auto max-w-lg px-4 py-10 sm:py-14">
      <h1 className="font-display text-2xl font-extrabold sm:text-3xl">
        Envoyer mes documents
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Choisissez vos fichiers, puis revenez à la borne avec le code affiché.
      </p>

      <div className="mt-8">
        <Suspense
          fallback={
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Chargement…
            </p>
          }
        >
          <UploadFormFromQuery />
        </Suspense>
      </div>
    </section>
  )
}
