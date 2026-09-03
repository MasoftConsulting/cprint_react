import { Suspense } from 'react'
import type { Metadata } from 'next'

import { CardsSkeleton } from '@/components/ui/skeletons'
import { requireUser } from '@/lib/dal'
import { createMachine } from '@/features/machines/actions'
import { MachineForm } from '@/features/machines/components/machine-form'

export const metadata: Metadata = {
  title: 'Ajouter une machine',
}

async function NewMachineForm() {
  await requireUser()

  return <MachineForm action={createMachine} submitLabel="Enregistrer" />
}

export default function NewMachinePage() {
  return (
    <Suspense fallback={<CardsSkeleton count={4} />}>
      <NewMachineForm />
    </Suspense>
  )
}
