'use client'

import { useActionState } from 'react'
import Link from 'next/link'

import { FieldError } from '@/components/ui/field-error'
import { FormToast } from '@/components/ui/form-toast'
import { SubmitButton } from '@/components/ui/submit-button'
import { initialFormState } from '@/lib/form-state'
import { assignMachine } from '@/features/affectations/actions'
import type { AvailableMachine } from '@/features/affectations/queries'
import { machineLabel } from '@/features/machines/schema'

const INPUT_CLASS =
  'mt-2 h-12 w-full rounded-xl border border-border bg-background px-4 outline-none focus:border-primary'

type SiteOption = { id_site: number; site_name: string }

export function AssignMachineForm({
  machines,
  sites,
}: {
  machines: AvailableMachine[]
  sites: SiteOption[]
}) {
  const [state, formAction] = useActionState(assignMachine, initialFormState)

  const nothingToAssign = machines.length === 0 || sites.length === 0

  return (
    <form action={formAction} className="surface-card flex h-full flex-col p-6 sm:p-8">
      <FormToast state={state} />

      <h2 className="font-display text-lg font-bold">Nouvelle affectation</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Installez une machine disponible sur un site. Une machine affectée n&apos;apparaît plus
        dans cette liste.
      </p>

      <div className="mt-6 flex-1 space-y-5">
        <div>
          <label htmlFor="id_machine" className="text-sm font-medium text-muted-foreground">
            Machine disponible
          </label>
          <select id="id_machine" name="id_machine" className={INPUT_CLASS} defaultValue="">
            <option value="" disabled>
              {machines.length === 0 ? 'Aucune machine disponible' : 'Choisir une machine…'}
            </option>
            {machines.map((machine) => (
              <option key={machine.id_machine} value={machine.id_machine}>
                {machineLabel(machine)}
                {machine.actif ? '' : ' — hors service'}
              </option>
            ))}
          </select>
          <FieldError messages={state.errors?.id_machine} />
        </div>

        <div>
          <label htmlFor="id_site" className="text-sm font-medium text-muted-foreground">
            Site d&apos;installation
          </label>
          <select id="id_site" name="id_site" className={INPUT_CLASS} defaultValue="">
            <option value="" disabled>
              {sites.length === 0 ? 'Aucun site enregistré' : 'Choisir un site…'}
            </option>
            {sites.map((site) => (
              <option key={site.id_site} value={site.id_site}>
                {site.site_name}
              </option>
            ))}
          </select>
          <FieldError messages={state.errors?.id_site} />
        </div>

        {nothingToAssign && (
          <p className="rounded-xl border border-dashed border-border px-4 py-4 text-sm text-muted-foreground">
            {machines.length === 0 ? (
              <>
                Tout le parc est déjà affecté.{' '}
                <Link href="/admin/machines/nouveau" className="text-primary hover:underline">
                  Ajoutez une machine
                </Link>{' '}
                pour continuer.
              </>
            ) : (
              <>
                Aucun site enregistré.{' '}
                <Link href="/admin/points/nouveau" className="text-primary hover:underline">
                  Créez un site
                </Link>{' '}
                pour continuer.
              </>
            )}
          </p>
        )}
      </div>

      <div className="mt-6">
        <SubmitButton pendingLabel="Affectation…">Affecter la machine</SubmitButton>
      </div>
    </form>
  )
}
