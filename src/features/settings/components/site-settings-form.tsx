'use client'

import { useActionState } from 'react'

import { FieldError } from '@/components/ui/field-error'
import { SubmitButton } from '@/components/ui/submit-button'
import { initialFormState } from '@/lib/form-state'
import { updateSiteSettings } from '@/features/settings/actions'
import type { SettingKey } from '@/features/settings/queries'

const INPUT_CLASS =
  'mt-2 h-12 w-full rounded-xl border border-border bg-background px-4 outline-none focus:border-primary'

export function SiteSettingsForm({ settings }: { settings: Record<SettingKey, string> }) {
  const [state, formAction] = useActionState(updateSiteSettings, initialFormState)

  return (
    <form action={formAction} className="space-y-6">
      {state.message && (
        <div
          className={
            state.status === 'success'
              ? 'max-w-2xl rounded-xl bg-success/10 px-4 py-3 text-sm text-success'
              : 'max-w-2xl rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive'
          }
        >
          {state.message}
        </div>
      )}

      <div className="surface-card max-w-2xl space-y-5 p-6 sm:p-8">
        <h2 className="font-display text-lg font-bold">Coordonnées de contact</h2>
        <p className="text-sm text-muted-foreground">
          Affichées dans le pied de page de toutes les pages et sur la page Contact.
        </p>

        <div>
          <label htmlFor="contact_phone" className="text-sm font-medium text-muted-foreground">
            Téléphone
          </label>
          <input
            id="contact_phone"
            name="contact_phone"
            type="text"
            defaultValue={settings.contact_phone}
            className={INPUT_CLASS}
          />
          <FieldError messages={state.errors?.contact_phone} />
        </div>

        <div>
          <label htmlFor="contact_email" className="text-sm font-medium text-muted-foreground">
            E-mail
          </label>
          <input
            id="contact_email"
            name="contact_email"
            type="email"
            defaultValue={settings.contact_email}
            className={INPUT_CLASS}
          />
          <FieldError messages={state.errors?.contact_email} />
        </div>

        <div>
          <label htmlFor="contact_address" className="text-sm font-medium text-muted-foreground">
            Adresse
          </label>
          <input
            id="contact_address"
            name="contact_address"
            type="text"
            defaultValue={settings.contact_address}
            className={INPUT_CLASS}
          />
          <FieldError messages={state.errors?.contact_address} />
        </div>
      </div>

      <div className="surface-card max-w-2xl space-y-5 p-6 sm:p-8">
        <h2 className="font-display text-lg font-bold">Carte prépayée</h2>
        <p className="text-sm text-muted-foreground">
          Montants de recharge proposés sur la page Tarifs.
        </p>

        <div>
          <label htmlFor="recharge_amounts" className="text-sm font-medium text-muted-foreground">
            Montants (FCFA, séparés par des virgules)
          </label>
          <input
            id="recharge_amounts"
            name="recharge_amounts"
            type="text"
            defaultValue={settings.recharge_amounts}
            placeholder="500,1000,2000,5000"
            className={INPUT_CLASS}
          />
          <FieldError messages={state.errors?.recharge_amounts} />
        </div>
      </div>

      <div className="surface-card max-w-2xl space-y-5 p-6 sm:p-8">
        <h2 className="font-display text-lg font-bold">Statistiques de la page d&apos;accueil</h2>
        <p className="text-sm text-muted-foreground">
          Affichées dans le bandeau du hero, à côté du nombre de points actifs (calculé
          automatiquement).
        </p>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="avg_print_time" className="text-sm font-medium text-muted-foreground">
              Temps moyen d&apos;impression
            </label>
            <input
              id="avg_print_time"
              name="avg_print_time"
              type="text"
              defaultValue={settings.avg_print_time}
              placeholder="3 min"
              className={INPUT_CLASS}
            />
            <FieldError messages={state.errors?.avg_print_time} />
          </div>

          <div>
            <label
              htmlFor="payment_methods_count"
              className="text-sm font-medium text-muted-foreground"
            >
              Nombre de moyens de paiement
            </label>
            <input
              id="payment_methods_count"
              name="payment_methods_count"
              type="number"
              min={0}
              defaultValue={settings.payment_methods_count}
              className={INPUT_CLASS}
            />
            <FieldError messages={state.errors?.payment_methods_count} />
          </div>
        </div>
      </div>

      <SubmitButton pendingLabel="Enregistrement…">Enregistrer</SubmitButton>
    </form>
  )
}
