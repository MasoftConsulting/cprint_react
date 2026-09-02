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
          <label htmlFor="name" className="text-sm font-medium text-muted-foreground">
            Nom du point
          </label>
          <input
            id="name"
            name="name"
            type="text"
            defaultValue={printPoint?.name}
            placeholder="Université de Lomé"
            className={INPUT_CLASS}
          />
          <FieldError messages={state.errors?.name} />
        </div>

        <div>
          <label htmlFor="location" className="text-sm font-medium text-muted-foreground">
            Emplacement
          </label>
          <input
            id="location"
            name="location"
            type="text"
            defaultValue={printPoint?.location}
            placeholder="Hall de la bibliothèque universitaire · Lomé"
            className={INPUT_CLASS}
          />
          <FieldError messages={state.errors?.location} />
        </div>

        <div>
          <label htmlFor="hours" className="text-sm font-medium text-muted-foreground">
            Horaires
          </label>
          <input
            id="hours"
            name="hours"
            type="text"
            defaultValue={printPoint?.hours}
            placeholder="Lun – Sam · 7h – 20h"
            className={INPUT_CLASS}
          />
          <FieldError messages={state.errors?.hours} />
        </div>

        <div>
          <label htmlFor="status" className="text-sm font-medium text-muted-foreground">
            Statut
          </label>
          <select
            id="status"
            name="status"
            defaultValue={printPoint?.status ?? 'bientot'}
            className={INPUT_CLASS}
          >
            <option value="actif">Actif</option>
            <option value="bientot">Bientôt disponible</option>
          </select>
          <FieldError messages={state.errors?.status} />
        </div>

        <div>
          <label htmlFor="position" className="text-sm font-medium text-muted-foreground">
            Ordre d&apos;affichage
          </label>
          <input
            id="position"
            name="position"
            type="number"
            min={0}
            defaultValue={printPoint?.position ?? 0}
            className={INPUT_CLASS}
          />
          <FieldError messages={state.errors?.position} />
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
