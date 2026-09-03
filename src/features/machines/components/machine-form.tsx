'use client'

import { useActionState } from 'react'
import Link from 'next/link'

import { FieldError } from '@/components/ui/field-error'
import { FormToast } from '@/components/ui/form-toast'
import { SubmitButton } from '@/components/ui/submit-button'
import { initialFormState, type FormState } from '@/lib/form-state'
import type { MachineWithSites } from '@/features/machines/queries'

const INPUT_CLASS =
  'mt-2 h-12 w-full rounded-xl border border-border bg-background px-4 outline-none focus:border-primary'

type Props = {
  action: (state: FormState, formData: FormData) => Promise<FormState>
  machine?: MachineWithSites
  submitLabel: string
}

export function MachineForm({ action, machine, submitLabel }: Props) {
  const [state, formAction] = useActionState(action, initialFormState)

  return (
    <form action={formAction}>
      <FormToast state={state} />

      {/* Deux cartes par ligne à partir de `lg`, une seule sur mobile. */}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section className="surface-card space-y-5 p-6 sm:p-8">
          <h2 className="font-display text-lg font-bold">Identification</h2>

          <div>
            <label htmlFor="serial_number" className="text-sm font-medium text-muted-foreground">
              Numéro de série
            </label>
            <input
              id="serial_number"
              name="serial_number"
              type="text"
              defaultValue={machine?.serial_number}
              placeholder="SHARP-MX3071-0042"
              className={INPUT_CLASS}
            />
            <FieldError messages={state.errors?.serial_number} />
          </div>

          <div>
            <label htmlFor="machine_name" className="text-sm font-medium text-muted-foreground">
              Nom de la machine <span className="text-xs font-normal">(facultatif)</span>
            </label>
            <input
              id="machine_name"
              name="machine_name"
              type="text"
              defaultValue={machine?.machine_name ?? ''}
              placeholder="Borne A — Bibliothèque"
              className={INPUT_CLASS}
            />
            <FieldError messages={state.errors?.machine_name} />
          </div>

          <div>
            <label htmlFor="actif" className="text-sm font-medium text-muted-foreground">
              Statut
            </label>
            <select
              id="actif"
              name="actif"
              defaultValue={machine ? String(machine.actif) : 'true'}
              className={INPUT_CLASS}
            >
              <option value="true">Active</option>
              <option value="false">Hors service</option>
            </select>
            <FieldError messages={state.errors?.actif} />
          </div>
        </section>

        <section className="surface-card space-y-5 p-6 sm:p-8">
          <div>
            <h2 className="font-display text-lg font-bold">Réseau</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Facultatif — utile pour la supervision à distance du parc.
            </p>
          </div>

          <div>
            <label htmlFor="mac_address" className="text-sm font-medium text-muted-foreground">
              Adresse MAC
            </label>
            <input
              id="mac_address"
              name="mac_address"
              type="text"
              defaultValue={machine?.mac_address ?? ''}
              placeholder="00:1A:2B:3C:4D:5E"
              className={INPUT_CLASS}
            />
            <FieldError messages={state.errors?.mac_address} />
          </div>

          <div>
            <label htmlFor="ip_address" className="text-sm font-medium text-muted-foreground">
              Adresse IP
            </label>
            <input
              id="ip_address"
              name="ip_address"
              type="text"
              defaultValue={machine?.ip_address ?? ''}
              placeholder="192.168.1.10"
              className={INPUT_CLASS}
            />
            <FieldError messages={state.errors?.ip_address} />
          </div>
        </section>

        <section className="surface-card space-y-5 p-6 sm:p-8">
          <h2 className="font-display text-lg font-bold">Cycle de vie</h2>

          <div>
            <label
              htmlFor="date_acquisition"
              className="text-sm font-medium text-muted-foreground"
            >
              Date d&apos;acquisition
            </label>
            <input
              id="date_acquisition"
              name="date_acquisition"
              type="date"
              defaultValue={machine?.date_acquisition ?? ''}
              className={INPUT_CLASS}
            />
            <FieldError messages={state.errors?.date_acquisition} />
          </div>

          <div>
            <label
              htmlFor="date_mise_service"
              className="text-sm font-medium text-muted-foreground"
            >
              Date de mise en service
            </label>
            <input
              id="date_mise_service"
              name="date_mise_service"
              type="date"
              defaultValue={machine?.date_mise_service ?? ''}
              className={INPUT_CLASS}
            />
            <FieldError messages={state.errors?.date_mise_service} />
          </div>
        </section>

        <section className="surface-card space-y-3 p-6 sm:p-8">
          <h2 className="font-display text-lg font-bold">Affectation</h2>
          <p className="text-sm text-muted-foreground">
            L&apos;installation d&apos;une machine sur un site se fait depuis le module{' '}
            <Link href="/admin/gestion" className="text-primary hover:underline">
              Gestion
            </Link>
            .
          </p>
          <p className="rounded-xl border border-dashed border-border px-4 py-3 text-sm">
            {machine?.sites.length
              ? `Actuellement installée sur : ${machine.sites.map((site) => site.site_name).join(', ')}.`
              : 'Cette machine n’est affectée à aucun site.'}
          </p>
        </section>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <Link
          href="/admin/machines"
          className="inline-flex h-12 items-center justify-center rounded-xl border border-border px-6 text-sm font-medium"
        >
          Annuler
        </Link>
        <SubmitButton pendingLabel="Enregistrement…">{submitLabel}</SubmitButton>
      </div>
    </form>
  )
}
