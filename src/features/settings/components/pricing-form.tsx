'use client'

import { useActionState } from 'react'

import { FieldError } from '@/components/ui/field-error'
import { SubmitButton } from '@/components/ui/submit-button'
import { initialFormState } from '@/lib/form-state'
import { updatePricing } from '@/features/settings/actions'

const INPUT_CLASS =
  'mt-2 h-12 w-full rounded-xl border border-border bg-background px-4 outline-none focus:border-primary'

export function PricingForm({
  priceNb,
  priceCouleur,
}: {
  priceNb: number
  priceCouleur: number
}) {
  const [state, formAction] = useActionState(updatePricing, initialFormState)

  return (
    <form action={formAction} className="surface-card mt-6 max-w-xl space-y-5 p-6 sm:p-8">
      {state.message && (
        <div
          className={
            state.status === 'success'
              ? 'rounded-xl bg-success/10 px-4 py-3 text-sm text-success'
              : 'rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive'
          }
        >
          {state.message}
        </div>
      )}

      <div>
        <label htmlFor="price_nb" className="text-sm font-medium text-muted-foreground">
          Prix Noir &amp; Blanc (FCFA / page)
        </label>
        <input
          id="price_nb"
          name="price_nb"
          type="number"
          min={0}
          defaultValue={priceNb}
          className={INPUT_CLASS}
        />
        <FieldError messages={state.errors?.price_nb} />
      </div>

      <div>
        <label htmlFor="price_couleur" className="text-sm font-medium text-muted-foreground">
          Prix Couleur (FCFA / page)
        </label>
        <input
          id="price_couleur"
          name="price_couleur"
          type="number"
          min={0}
          defaultValue={priceCouleur}
          className={INPUT_CLASS}
        />
        <FieldError messages={state.errors?.price_couleur} />
      </div>

      <SubmitButton pendingLabel="Enregistrement…">Enregistrer</SubmitButton>
    </form>
  )
}
