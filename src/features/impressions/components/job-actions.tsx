'use client'

import { useActionState } from 'react'
import { MailCheck, Trash2 } from 'lucide-react'

import { FormToast } from '@/components/ui/form-toast'
import { SubmitButton } from '@/components/ui/submit-button'
import { initialFormState } from '@/lib/form-state'
import { expireJob, resendCode } from '@/features/impressions/actions'

/**
 * Les deux gestes de dépannage : renvoyer le code au client qui dit n'avoir
 * rien reçu, et expirer un document qui ne doit plus sortir. Les deux sont
 * confirmés : le second efface le fichier et invalide le code.
 */

export function ResendCodeButton({ code }: { code: string }) {
  const [state, formAction] = useActionState(resendCode, initialFormState)

  return (
    <form action={formAction}>
      <FormToast state={state} />
      <input type="hidden" name="code" value={code} />
      <SubmitButton pendingLabel="Envoi…" className="h-11 bg-primary/10 text-primary shadow-none hover:bg-primary/15">
        <MailCheck className="h-4 w-4" aria-hidden />
        Renvoyer le code par e-mail
      </SubmitButton>
    </form>
  )
}

export function ExpireJobButton({ jobId, filename }: { jobId: number; filename: string }) {
  const [state, formAction] = useActionState(expireJob, initialFormState)

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (
          !window.confirm(
            `Expirer « ${filename} » ?\n\nSon fichier sera effacé et son code cessera de fonctionner. Cette action est définitive.`,
          )
        ) {
          event.preventDefault()
        }
      }}
    >
      <FormToast state={state} />
      <input type="hidden" name="job_id" value={jobId} />
      <SubmitButton
        pendingLabel="Expiration…"
        className="h-11 bg-destructive/10 text-destructive shadow-none hover:bg-destructive/15"
      >
        <Trash2 className="h-4 w-4" aria-hidden />
        Expirer ce document
      </SubmitButton>
    </form>
  )
}
