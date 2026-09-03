'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'

import { FieldError } from '@/components/ui/field-error'
import { SubmitButton } from '@/components/ui/submit-button'
import { initialFormState, type FormState } from '@/lib/form-state'
import type { PrintPoint } from '@/features/print-points/queries'

// Leaflet a besoin de `window` : chargé uniquement côté navigateur.
const CoordinatesPicker = dynamic(
  () =>
    import('@/features/print-points/components/coordinates-picker').then(
      (mod) => mod.CoordinatesPicker,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="mt-2 h-72 w-full animate-pulse rounded-xl border border-border bg-secondary" />
    ),
  },
)

const INPUT_CLASS =
  'mt-2 h-12 w-full rounded-xl border border-border bg-background px-4 outline-none focus:border-primary'

type Props = {
  action: (state: FormState, formData: FormData) => Promise<FormState>
  printPoint?: PrintPoint
  submitLabel: string
}

export function PrintPointForm({ action, printPoint, submitLabel }: Props) {
  const [state, formAction] = useActionState(action, initialFormState)

  return (
    <form action={formAction} className="surface-card max-w-2xl p-6 sm:p-8">
      {state.status === 'error' && state.message && (
        <div className="mb-5 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.message}
        </div>
      )}

      <div className="space-y-5">
        <div>
          <label htmlFor="site_name" className="text-sm font-medium text-muted-foreground">
            Nom du site
          </label>
          <input
            id="site_name"
            name="site_name"
            type="text"
            defaultValue={printPoint?.site_name}
            placeholder="Université de Lomé"
            className={INPUT_CLASS}
          />
          <FieldError messages={state.errors?.site_name} />
        </div>

        <div>
          <label htmlFor="site_address" className="text-sm font-medium text-muted-foreground">
            Adresse <span className="text-xs font-normal">(facultatif)</span>
          </label>
          <input
            id="site_address"
            name="site_address"
            type="text"
            defaultValue={printPoint?.site_address ?? ''}
            placeholder="Hall de la bibliothèque universitaire"
            className={INPUT_CLASS}
          />
          <FieldError messages={state.errors?.site_address} />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="city" className="text-sm font-medium text-muted-foreground">
              Ville <span className="text-xs font-normal">(facultatif)</span>
            </label>
            <input
              id="city"
              name="city"
              type="text"
              defaultValue={printPoint?.city ?? ''}
              placeholder="Lomé"
              className={INPUT_CLASS}
            />
            <FieldError messages={state.errors?.city} />
          </div>
          <div>
            <label htmlFor="country" className="text-sm font-medium text-muted-foreground">
              Pays
            </label>
            <input
              id="country"
              name="country"
              type="text"
              defaultValue={printPoint?.country ?? 'Togo'}
              placeholder="Togo"
              className={INPUT_CLASS}
            />
            <FieldError messages={state.errors?.country} />
          </div>
        </div>

        <div>
          <label htmlFor="actif" className="text-sm font-medium text-muted-foreground">
            Statut
          </label>
          <select
            id="actif"
            name="actif"
            defaultValue={printPoint?.actif ? 'true' : 'false'}
            className={INPUT_CLASS}
          >
            <option value="true">Actif</option>
            <option value="false">Bientôt disponible</option>
          </select>
          <FieldError messages={state.errors?.actif} />
        </div>

        <CoordinatesPicker
          defaultLatitude={printPoint?.latitude ?? null}
          defaultLongitude={printPoint?.longitude ?? null}
          errors={{ latitude: state.errors?.latitude, longitude: state.errors?.longitude }}
        />
      </div>

      <div className="mt-8 flex justify-end gap-3">
        <Link
          href="/admin/points"
          className="inline-flex h-12 items-center justify-center rounded-xl border border-border px-6 text-sm font-medium"
        >
          Annuler
        </Link>
        <SubmitButton pendingLabel="Enregistrement…">{submitLabel}</SubmitButton>
      </div>
    </form>
  )
}
