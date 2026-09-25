'use client'

import { useActionState } from 'react'
import { Search } from 'lucide-react'

import { FormToast } from '@/components/ui/form-toast'
import { SubmitButton } from '@/components/ui/submit-button'
import { initialFormState } from '@/lib/form-state'
import { searchCode } from '@/features/impressions/actions'

/**
 * Recherche d'un code de retrait : le premier geste quand un client appelle
 * parce que « son code ne marche pas ». La fiche du code dit pourquoi.
 */
export function CodeSearch() {
  const [state, formAction] = useActionState(searchCode, initialFormState)

  return (
    <form action={formAction} className="surface-card p-6 sm:p-8">
      <FormToast state={state} />
      <h2 className="font-display text-lg font-bold">Retrouver un code</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Les 6 chiffres reçus par le client. Fonctionne même si le code est expiré ou déjà
        imprimé.
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          name="code"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          required
          placeholder="123456"
          aria-label="Code de retrait à 6 chiffres"
          className="h-12 flex-1 rounded-xl border border-border bg-background px-4 text-center font-mono text-xl tracking-[0.3em] outline-none focus:border-primary"
        />
        <SubmitButton className="sm:w-48">
          <Search className="h-4 w-4" aria-hidden />
          Rechercher
        </SubmitButton>
      </div>
    </form>
  )
}
