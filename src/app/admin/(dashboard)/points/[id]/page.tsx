import { Suspense } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { CardsSkeleton } from '@/components/ui/skeletons'
import { requireUser } from '@/lib/dal'
import { updatePrintPoint } from '@/features/print-points/actions'
import { PrintPointForm } from '@/features/print-points/components/print-point-form'
import { findPrintPoint } from '@/features/print-points/queries'

export const metadata: Metadata = {
  title: 'Modifier un site',
}

async function EditSiteForm({ params }: { params: Promise<{ id: string }> }) {
  await requireUser()

  const { id } = await params
  const siteId = Number(id)
  if (!Number.isInteger(siteId)) notFound()

  const printPoint = await findPrintPoint(siteId)
  if (!printPoint) notFound()

  // `bind` fige l'identifiant côté serveur : le client ne peut pas le remplacer.
  const action = updatePrintPoint.bind(null, printPoint.id_site)

  return <PrintPointForm action={action} printPoint={printPoint} submitLabel="Mettre à jour" />
}

export default function EditPrintPointPage(props: PageProps<'/admin/points/[id]'>) {
  return (
    <Suspense fallback={<CardsSkeleton count={2} />}>
      <EditSiteForm params={props.params} />
    </Suspense>
  )
}
