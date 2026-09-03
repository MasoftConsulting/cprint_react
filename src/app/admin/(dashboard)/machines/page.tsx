import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { TableSkeleton } from '@/components/ui/skeletons'
import { cn } from '@/lib/cn'
import { requireUser } from '@/lib/dal'
import { deleteMachine } from '@/features/machines/actions'
import { getMachines } from '@/features/machines/queries'
import { formatDate, machineCapabilities, machineStatusLabel } from '@/features/machines/schema'
import { DeleteMachineButton } from '@/features/machines/components/delete-machine-button'

export const metadata: Metadata = {
  title: 'Parc de machines',
}

async function MachinesTable() {
  await requireUser()
  const machines = await getMachines()

  return (
    <div className="surface-card mt-6 overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-secondary/60 text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Machine</th>
            <th className="px-4 py-3 font-medium">N° de série</th>
            <th className="px-4 py-3 font-medium">Capacités</th>
            <th className="px-4 py-3 font-medium">Réseau</th>
            <th className="px-4 py-3 font-medium">Mise en service</th>
            <th className="px-4 py-3 font-medium">Site</th>
            <th className="px-4 py-3 font-medium">Statut</th>
            <th className="px-4 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {machines.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                Aucune machine pour le moment.
              </td>
            </tr>
          )}

          {machines.map((machine) => (
            <tr key={machine.id_machine}>
              <td className="px-4 py-3 font-medium">{machine.machine_name ?? '—'}</td>
              <td className="px-4 py-3 text-muted-foreground">{machine.serial_number}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {machineCapabilities(machine)}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {machine.ip_address ?? '—'}
                {machine.mac_address && (
                  <span className="block text-xs">{machine.mac_address}</span>
                )}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {formatDate(machine.date_mise_service)}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {machine.sites.length === 0
                  ? 'Disponible'
                  : machine.sites.map((site) => site.site_name).join(', ')}
              </td>
              <td className="px-4 py-3">
                <span
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-semibold',
                    machine.actif
                      ? 'bg-success/10 text-success'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {machineStatusLabel(machine.actif)}
                </span>
              </td>
              <td className="px-4 py-3 text-right whitespace-nowrap">
                <Link
                  href={`/admin/machines/${machine.id_machine}`}
                  className="font-medium text-primary hover:underline"
                >
                  Modifier
                </Link>
                <form action={deleteMachine} className="inline">
                  <input type="hidden" name="id_machine" value={machine.id_machine} />
                  <DeleteMachineButton />
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function AdminMachinesPage() {
  // L'en-tête ne dépend pas de la requête : il s'affiche immédiatement,
  // le tableau est streamé derrière la frontière Suspense.
  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Photocopieurs Sharp déployés et leur affectation aux sites.
        </p>
        <Link
          href="/admin/machines/nouveau"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cta px-5 text-sm font-medium whitespace-nowrap text-cta-foreground hover:brightness-105"
        >
          + Ajouter une machine
        </Link>
      </div>

      <Suspense fallback={<TableSkeleton />}>
        <MachinesTable />
      </Suspense>
    </>
  )
}
