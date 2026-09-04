import { Suspense } from 'react'
import type { Metadata } from 'next'

import { CardsSkeleton } from '@/components/ui/skeletons'
import { requireUser } from '@/lib/dal'
import { createFaq } from '@/features/faq/actions'
import { FaqForm } from '@/features/faq/components/faq-form'

export const metadata: Metadata = {
  title: 'Ajouter une question',
}

async function NewFaqForm() {
  await requireUser()

  return <FaqForm action={createFaq} submitLabel="Enregistrer" />
}

export default function NewFaqPage() {
  return (
    <Suspense fallback={<CardsSkeleton count={2} />}>
      <NewFaqForm />
    </Suspense>
  )
}
