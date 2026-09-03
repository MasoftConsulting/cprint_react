import type { Metadata } from 'next'

import { requireUser } from '@/lib/dal'
import { createMachine } from '@/features/machines/actions'
import { MachineForm } from '@/features/machines/components/machine-form'

export const metadata: Metadata = {
  title: 'Ajouter une machine',
}

export default async function NewMachinePage() {
  await requireUser()

  return <MachineForm action={createMachine} submitLabel="Enregistrer" />
}
