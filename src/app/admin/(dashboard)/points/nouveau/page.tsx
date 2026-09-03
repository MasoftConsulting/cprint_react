import { Suspense } from 'react'
import type { Metadata } from 'next'

import { CardsSkeleton } from '@/components/ui/skeletons'
import { requireUser } from '@/lib/dal'
import { createPrintPoint } from '@/features/print-points/actions'
import { PrintPointForm } from '@/features/print-points/components/print-point-form'

export const metadata: Metadata = {
  title: "Ajouter un site d'impression",
}

async function NewSiteForm() {
  await requireUser()

  return <PrintPointForm action={createPrintPoint} submitLabel="Enregistrer" />
}

export default function NewPrintPointPage() {
  return (
    <Suspense fallback={<CardsSkeleton count={2} />}>
      <NewSiteForm />
    </Suspense>
  )
}
