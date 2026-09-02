import type { Metadata } from 'next'

import { requireUser } from '@/lib/dal'
import { createPrintPoint } from '@/features/print-points/actions'
import { PrintPointForm } from '@/features/print-points/components/print-point-form'

export const metadata: Metadata = {
  title: "Ajouter un point d'impression",
}

export default async function NewPrintPointPage() {
  await requireUser()

  return <PrintPointForm action={createPrintPoint} submitLabel="Enregistrer" />
}
