import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { requireUser } from '@/lib/dal'
import { updatePrintPoint } from '@/features/print-points/actions'
import { PrintPointForm } from '@/features/print-points/components/print-point-form'
import { findPrintPoint } from '@/features/print-points/queries'

export const metadata: Metadata = {
  title: "Modifier un point d'impression",
}

export default async function EditPrintPointPage(props: PageProps<'/admin/points/[id]'>) {
  await requireUser()

  const { id } = await props.params
  const printPointId = Number(id)
  if (!Number.isInteger(printPointId)) notFound()

  const printPoint = await findPrintPoint(printPointId)
  if (!printPoint) notFound()

  // `bind` fige l'identifiant côté serveur : le client ne peut pas le remplacer.
  const action = updatePrintPoint.bind(null, printPoint.id)

  return (
    <PrintPointForm action={action} printPoint={printPoint} submitLabel="Mettre à jour" />
  )
}
