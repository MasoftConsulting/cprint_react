import { Suspense } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { CardsSkeleton } from '@/components/ui/skeletons'
import { requireUser } from '@/lib/dal'
import { updateFaq } from '@/features/faq/actions'
import { FaqForm } from '@/features/faq/components/faq-form'
import { findFaq } from '@/features/faq/queries'

export const metadata: Metadata = {
  title: 'Modifier une question',
}

async function EditFaqForm({ params }: { params: Promise<{ id: string }> }) {
  await requireUser()

  const { id } = await params
  const faqId = Number(id)
  if (!Number.isInteger(faqId)) notFound()

  const entry = await findFaq(faqId)
  if (!entry) notFound()

  // `bind` fige l'identifiant côté serveur : le client ne peut pas le remplacer.
  const action = updateFaq.bind(null, entry.id_faq)

  return <FaqForm action={action} entry={entry} submitLabel="Mettre à jour" />
}

export default function EditFaqPage(props: PageProps<'/admin/faq/[id]'>) {
  return (
    <Suspense fallback={<CardsSkeleton count={2} />}>
      <EditFaqForm params={props.params} />
    </Suspense>
  )
}
