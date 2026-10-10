'use client'

import { useActionState } from 'react'

import { FieldError } from '@/components/ui/field-error'
import { FormToast } from '@/components/ui/form-toast'
import { SubmitButton } from '@/components/ui/submit-button'
import { initialFormState } from '@/lib/form-state'
import { updatePricing } from '@/features/settings/actions'

const INPUT_CLASS =
  'mt-2 h-12 w-full rounded-xl border border-border bg-background px-4 outline-none focus:border-primary'

export function PricingForm({
  priceNb,
  priceCouleur,
  priceLivret,
}: {
  priceNb: number
  priceCouleur: number
  priceLivret: number
}) {
  const [state, formAction] = useActionState(updatePricing, initialFormState)

  return (
    <form action={formAction} className="mt-6">
      <FormToast state={state} />

      {/* Deux cartes par ligne à partir de `lg`, une seule sur mobile. */}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section className="surface-card space-y-5 p-6 sm:p-8">
          <h2 className="font-display text-lg font-bold">Noir &amp; Blanc</h2>

          <div>
            <label htmlFor="price_nb" className="text-sm font-medium text-muted-foreground">
              Prix par page (FCFA)
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
        </section>

        <section className="surface-card space-y-5 p-6 sm:p-8">
          <h2 className="font-display text-lg font-bold">Couleur</h2>

          <div>
            <label htmlFor="price_couleur" className="text-sm font-medium text-muted-foreground">
              Prix par page (FCFA)
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
        </section>
      </div>

      {/* La reliure ne se facture pas à la page : une piqûre à cheval coûte
          la même chose sur huit pages que sur quarante. */}
      <section className="surface-card mt-6 space-y-5 p-6 sm:p-8">
        <div>
          <h2 className="font-display text-lg font-bold">Livret agrafé</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Supplément facturé <strong>par exemplaire relié</strong>, en plus des pages.
            Proposé uniquement dans les points équipés d&apos;un finisseur, et choisi à la
            borne du magasin.
          </p>
        </div>

        <div className="max-w-xs">
          <label htmlFor="price_livret" className="text-sm font-medium text-muted-foreground">
            Supplément par livret (FCFA)
          </label>
          <input
            id="price_livret"
            name="price_livret"
            type="number"
            min={0}
            defaultValue={priceLivret}
            className={INPUT_CLASS}
          />
          <FieldError messages={state.errors?.price_livret} />
          <p className="mt-2 text-xs text-muted-foreground">
            À zéro, la reliure est <strong>offerte</strong>.
          </p>
        </div>
      </section>

      <div className="mt-6">
        <SubmitButton pendingLabel="Enregistrement…">Enregistrer</SubmitButton>
      </div>
    </form>
  )
}
