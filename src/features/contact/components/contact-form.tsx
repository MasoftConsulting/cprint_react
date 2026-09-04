'use client'

import { useActionState } from 'react'

import { FieldError } from '@/components/ui/field-error'
import { SubmitButton } from '@/components/ui/submit-button'
import { initialFormState } from '@/lib/form-state'
import { FormToast } from '@/components/ui/form-toast'
import { sendContactMessage } from '@/features/contact/actions'

const INPUT_CLASS =
  'mt-2 h-12 w-full rounded-xl border border-border bg-background px-4 outline-none focus:border-primary'

export function ContactForm() {
  const [state, formAction] = useActionState(sendContactMessage, initialFormState)

  return (
    <form action={formAction} className="surface-card space-y-5 p-6 sm:p-8">
      <FormToast state={state} />

      <div>
        <label htmlFor="nom" className="text-sm font-medium text-muted-foreground">
          Nom complet
        </label>
        <input id="nom" name="nom" type="text" className={INPUT_CLASS} />
        <FieldError messages={state.errors?.nom} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="telephone" className="text-sm font-medium text-muted-foreground">
            Téléphone
          </label>
          <input id="telephone" name="telephone" type="tel" className={INPUT_CLASS} />
          <FieldError messages={state.errors?.telephone} />
        </div>
        <div>
          <label htmlFor="email" className="text-sm font-medium text-muted-foreground">
            E-mail
          </label>
          <input id="email" name="email" type="email" className={INPUT_CLASS} />
          <FieldError messages={state.errors?.email} />
        </div>
      </div>

      <div>
        <label htmlFor="message" className="text-sm font-medium text-muted-foreground">
          Votre message
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-primary"
        />
        <FieldError messages={state.errors?.message} />
      </div>

      <SubmitButton className="h-14 px-8 text-base">Envoyer le message</SubmitButton>
    </form>
  )
}
