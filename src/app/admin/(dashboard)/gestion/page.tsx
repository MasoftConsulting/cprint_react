import { Suspense } from 'react'
import type { Metadata } from 'next'
import { MapPin, Server } from 'lucide-react'

import { cn } from '@/lib/cn'
import { requireUser } from '@/lib/dal'
import { unassignMachine } from '@/features/affectations/actions'
import { getAvailableMachines, getSiteAssignments } from '@/features/affectations/queries'
import { AssignMachineForm } from '@/features/affectations/components/assign-machine-form'
import { UnassignButton } from '@/features/affectations/components/unassign-button'
import { machineLabel } from '@/features/machines/schema'

export const metadata: Metadata = {
  title: 'Gestion des affectations',
}

async function AssignmentBoard() {
  await requireUser()
  const [machines, sites] = await Promise.all([getAvailableMachines(), getSiteAssignments()])

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <AssignMachineForm
        machines={machines}
        sites={sites.map(({ id_site, site_name }) => ({ id_site, site_name }))}
      />

      <div className="surface-card flex h-full flex-col p-6 sm:p-8">
        <h2 className="font-display text-lg font-bold">Machines disponibles</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {machines.length === 0
            ? 'Tout le parc est actuellement affecté à un site.'
            : `${machines.length} machine${machines.length > 1 ? 's' : ''} en attente d'affectation.`}
        </p>

        <ul className="mt-6 flex-1 space-y-2">
          {machines.map((machine) => (
            <li
              key={machine.id_machine}
              className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 text-sm"
            >
              <span className="flex min-w-0 items-center gap-3">
                <Server className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                <span className="truncate">{machineLabel(machine)}</span>
              </span>
              <span
                className={cn(
                  'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                  machine.actif ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground',
                )}
              >
                {machine.actif ? 'Active' : 'Hors service'}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {sites.map((site) => (
        <div key={site.id_site} className="surface-card p-6 sm:p-8">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold">
            <MapPin className="h-5 w-5 shrink-0 text-primary" aria-hidden />
            {site.site_name}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {site.machines.length === 0
              ? 'Aucune machine installée sur ce site.'
              : `${site.machines.length} machine${site.machines.length > 1 ? 's' : ''} installée${site.machines.length > 1 ? 's' : ''}.`}
          </p>

          <ul className="mt-5 space-y-2">
            {site.machines.map((machine) => (
              <li
                key={machine.id_affectation}
                className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 text-sm"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{machineLabel(machine)}</span>
                  <span className="block text-xs text-muted-foreground">
                    {machine.serial_number}
                  </span>
                </span>
                <form action={unassignMachine}>
                  <input type="hidden" name="id_affectation" value={machine.id_affectation} />
                  <UnassignButton />
                </form>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

function BoardSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {[0, 1, 2, 3].map((index) => (
        <div key={index} className="surface-card h-72 animate-pulse" />
      ))}
    </div>
  )
}

export default function AdminGestionPage() {
  return (
    <>
      <p className="text-sm text-muted-foreground">
        Affectez chaque machine du parc au site où elle est installée. Une machine ne peut équiper
        qu&apos;un seul site à la fois.
      </p>

      <div className="mt-6">
        {/* La lecture dépend de la session : elle est streamée derrière une frontière. */}
        <Suspense fallback={<BoardSkeleton />}>
          <AssignmentBoard />
        </Suspense>
      </div>
    </>
  )
}
