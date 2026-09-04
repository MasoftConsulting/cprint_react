'use client'

import { useActionState } from 'react'
import Link from 'next/link'

import { FieldError } from '@/components/ui/field-error'
import { FormToast } from '@/components/ui/form-toast'
import { SubmitButton } from '@/components/ui/submit-button'
import { initialFormState, type FormState } from '@/lib/form-state'
import type { FaqEntry } from '@/features/faq/queries'
import { FAQ_PAGE_LABELS, faqPages } from '@/features/faq/schema'

const INPUT_CLASS =
  'mt-2 h-12 w-full rounded-xl border border-border bg-background px-4 outline-none focus:border-primary'

type Props = {
  action: (state: FormState, formData: FormData) => Promise<FormState>
  entry?: FaqEntry
  submitLabel: string
}

export function FaqForm({ action, entry, submitLabel }: Props) {
  const [state, formAction] = useActionState(action, initialFormState)

  return (
    <form action={formAction}>
      <FormToast state={state} />

      {/* Deux cartes par ligne à partir de `lg`, une seule sur mobile. */}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section className="surface-card space-y-5 p-6 sm:p-8">
          <h2 className="font-display text-lg font-bold">Publication</h2>

          <div>
            <label htmlFor="page" className="text-sm font-medium text-muted-foreground">
              Page d&apos;affichage
            </label>
            <select
              id="page"
              name="page"
              defaultValue={entry?.page ?? 'comment-ca-marche'}
              className={INPUT_CLASS}
            >
              {faqPages.map((value) => (
                <option key={value} value={value}>
                  {FAQ_PAGE_LABELS[value]}
                </option>
              ))}
            </select>
            <FieldError messages={state.errors?.page} />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="position" className="text-sm font-medium text-muted-foreground">
                Ordre d&apos;affichage
              </label>
              <input
                id="position"
                name="position"
                type="number"
                min={0}
                defaultValue={entry?.position ?? 0}
                className={INPUT_CLASS}
              />
              <FieldError messages={state.errors?.position} />
            </div>

            <div>
              <label htmlFor="actif" className="text-sm font-medium text-muted-foreground">
                Statut
              </label>
              <select
                id="actif"
                name="actif"
                defaultValue={entry ? String(entry.actif) : 'true'}
                className={INPUT_CLASS}
              >
                <option value="true">Publiée</option>
                <option value="false">Masquée</option>
              </select>
              <FieldError messages={state.errors?.actif} />
            </div>
          </div>
        </section>

        <section className="surface-card space-y-5 p-6 sm:p-8">
          <h2 className="font-display text-lg font-bold">Contenu</h2>

          <div>
            <label htmlFor="question" className="text-sm font-medium text-muted-foreground">
              Question
            </label>
            <input
              id="question"
              name="question"
              type="text"
              defaultValue={entry?.question}
              placeholder="Quels formats de fichiers sont acceptés ?"
              className={INPUT_CLASS}
            />
            <FieldError messages={state.errors?.question} />
          </div>

          <div>
            <label htmlFor="reponse" className="text-sm font-medium text-muted-foreground">
              Réponse
            </label>
            <textarea
              id="reponse"
              name="reponse"
              rows={5}
              defaultValue={entry?.reponse}
              placeholder="PDF, DOCX, PPTX, JPG et PNG, jusqu'à 50 Mo par envoi."
              className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-primary"
            />
            <FieldError messages={state.errors?.reponse} />
          </div>
        </section>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <Link
          href="/admin/faq"
          className="inline-flex h-12 items-center justify-center rounded-xl border border-border px-6 text-sm font-medium"
        >
          Annuler
        </Link>
        <SubmitButton pendingLabel="Enregistrement…">{submitLabel}</SubmitButton>
      </div>
    </form>
  )
}
