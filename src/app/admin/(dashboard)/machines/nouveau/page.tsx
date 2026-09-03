import type { Metadata } from 'next'

import { requireUser } from '@/lib/dal'
import { createMachine } from '@/features/machines/actions'
import { MachineForm } from '@/features/machines/components/machine-form'
import { getPrintPoints } from '@/features/print-points/queries'

export const metadata: Metadata = {
  title: 'Ajouter une machine',
}

export default async function NewMachinePage() {
  await requireUser()
  const sites = await getPrintPoints()

  return (
    <MachineForm
      action={createMachine}
      sites={sites.map(({ id_site, site_name }) => ({ id_site, site_name }))}
      submitLabel="Enregistrer"
    />
  )
}
