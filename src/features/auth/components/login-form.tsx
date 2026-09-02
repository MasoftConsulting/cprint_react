'use client'

import { useActionState, useState } from 'react'

import { FieldError } from '@/components/ui/field-error'
import { SubmitButton } from '@/components/ui/submit-button'
import { initialFormState } from '@/lib/form-state'
import { login } from '@/features/auth/actions'

const INPUT_CLASS =
  'mt-2 h-12 w-full rounded-xl border border-border bg-background px-4 outline-none focus:border-primary'

export function LoginForm() {
  const [state, formAction] = useActionState(login, initialFormState)
  const [showPassword, setShowPassword] = useState(false)

  return (
    <form action={formAction} className="mt-8 space-y-5">
      {state.status === 'error' && state.message && (
        <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.message}
        </div>
      )}

      <div>
        <label htmlFor="email" className="text-sm font-medium text-muted-foreground">
          Identifiant e-mail
        </label>
        <input id="email" name="email" type="email" autoFocus className={INPUT_CLASS} />
        <FieldError messages={state.errors?.email} />
      </div>

      <div>
        <label htmlFor="password" className="text-sm font-medium text-muted-foreground">
          Mot de passe
        </label>
        <div className="relative mt-2">
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            className="h-12 w-full rounded-xl border border-border bg-background px-4 pr-12 outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            className="absolute inset-y-0 right-0 flex items-center px-4 text-xs font-medium text-muted-foreground hover:text-foreground"
            aria-label="Afficher ou masquer le mot de passe"
          >
            {showPassword ? 'Masquer' : 'Afficher'}
          </button>
        </div>
        <FieldError messages={state.errors?.password} />
      </div>

      <SubmitButton className="w-full" pendingLabel="Connexion…">
        Connexion
      </SubmitButton>
    </form>
  )
}
