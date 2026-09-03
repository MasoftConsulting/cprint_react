import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { requireUser } from '@/lib/dal'
import { updateMachine } from '@/features/machines/actions'
import { MachineForm } from '@/features/machines/components/machine-form'
import { findMachine } from '@/features/machines/queries'

export const metadata: Metadata = {
  title: 'Modifier une machine',
}

export default async function EditMachinePage(props: PageProps<'/admin/machines/[id]'>) {
  await requireUser()

  const { id } = await props.params
  const machineId = Number(id)
  if (!Number.isInteger(machineId)) notFound()

  const machine = await findMachine(machineId)
  if (!machine) notFound()

  // `bind` fige l'identifiant côté serveur : le client ne peut pas le remplacer.
  const action = updateMachine.bind(null, machine.id_machine)

  return <MachineForm action={action} machine={machine} submitLabel="Mettre à jour" />
}
