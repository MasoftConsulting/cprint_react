'use client'

import { useActionState } from 'react'

import { FieldError } from '@/components/ui/field-error'
import { SubmitButton } from '@/components/ui/submit-button'
import { initialFormState } from '@/lib/form-state'
import { updateProfile } from '@/features/auth/actions'

const INPUT_CLASS =
  'mt-2 h-12 w-full rounded-xl border border-border bg-background px-4 outline-none focus:border-primary'

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const [state, formAction] = useActionState(updateProfile, initialFormState)

  return (
    <form action={formAction} className="space-y-6">
      {state.message && (
        <div
          className={
            state.status === 'success'
              ? 'max-w-xl rounded-xl bg-success/10 px-4 py-3 text-sm text-success'
              : 'max-w-xl rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive'
          }
        >
          {state.message}
        </div>
      )}

      <div className="surface-card max-w-xl space-y-5 p-6 sm:p-8">
        <h2 className="font-display text-lg font-bold">Informations du compte</h2>

        <div>
          <label htmlFor="name" className="text-sm font-medium text-muted-foreground">
            Nom
          </label>
          <input id="name" name="name" type="text" defaultValue={name} className={INPUT_CLASS} />
          <FieldError messages={state.errors?.name} />
        </div>

        <div>
          <label htmlFor="email" className="text-sm font-medium text-muted-foreground">
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={email}
            className={INPUT_CLASS}
          />
          <FieldError messages={state.errors?.email} />
        </div>
      </div>

      <div className="surface-card max-w-xl space-y-5 p-6 sm:p-8">
        <h2 className="font-display text-lg font-bold">Changer de mot de passe</h2>
        <p className="text-sm text-muted-foreground">
          Laissez ces champs vides pour garder votre mot de passe actuel.
        </p>

        <div>
          <label htmlFor="current_password" className="text-sm font-medium text-muted-foreground">
            Mot de passe actuel
          </label>
          <input
            id="current_password"
            name="current_password"
            type="password"
            autoComplete="current-password"
            className={INPUT_CLASS}
          />
          <FieldError messages={state.errors?.current_password} />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="password" className="text-sm font-medium text-muted-foreground">
              Nouveau mot de passe
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              className={INPUT_CLASS}
            />
            <FieldError messages={state.errors?.password} />
          </div>
          <div>
            <label
              htmlFor="password_confirmation"
              className="text-sm font-medium text-muted-foreground"
            >
              Confirmer le mot de passe
            </label>
            <input
              id="password_confirmation"
              name="password_confirmation"
              type="password"
              autoComplete="new-password"
              className={INPUT_CLASS}
            />
            <FieldError messages={state.errors?.password_confirmation} />
          </div>
        </div>
      </div>

      <SubmitButton pendingLabel="Enregistrement…">Enregistrer</SubmitButton>
    </form>
  )
}
