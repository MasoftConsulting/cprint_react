'use client'

import { useActionState } from 'react'
import { KeyRound, Plus, Trash2 } from 'lucide-react'

import { FieldError } from '@/components/ui/field-error'
import { SubmitButton } from '@/components/ui/submit-button'
import { initialFormState, type FormState } from '@/lib/form-state'
import { cn } from '@/lib/cn'
import {
  createAgent,
  deleteAgent,
  rotateAgentToken,
} from '@/features/impressions/actions'
import { formatCentralDate } from '@/features/impressions/format'
import type { PrintAgent } from '@/features/impressions/types'

/**
 * Création, renouvellement de jeton et suppression d'un point d'impression.
 *
 * Le jeton s'affiche **dans la page**, pas en notification : la centrale n'en
 * garde que l'empreinte, il faut donc avoir le temps de le recopier dans le
 * fichier de réglages de l'agent. Il disparaît au rechargement suivant.
 */

function TokenPanel({ state }: { state: FormState }) {
  if (state.status === 'idle' || !state.message) return null

  return (
    <div
      className={cn(
        'mt-4 rounded-xl border p-4 text-sm',
        state.status === 'success'
          ? 'border-primary/30 bg-primary/5'
          : 'border-destructive/30 bg-destructive/10 text-destructive',
      )}
    >
      <p className="font-medium break-words">{state.message}</p>
      {state.status === 'success' && state.message.includes(':') && (
        <p className="mt-2 text-xs text-muted-foreground">
          Recopiez la valeur ci-dessus dans <code>agent\.env</code> du point, ou passez-la au
          script : <code>installer-agent.ps1 -Nom … -Jeton …</code>. Elle ne sera plus affichée.
        </p>
      )}
    </div>
  )
}

export function CreateAgentForm() {
  const [state, formAction] = useActionState(createAgent, initialFormState)

  return (
    <form action={formAction} className="surface-card p-6 sm:p-8">
      <h2 className="font-display text-lg font-bold">Ajouter un point d&apos;impression</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Le jeton créé ici est celui que l&apos;agent utilisera pour parler à la centrale.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="agent-name" className="text-sm font-medium text-muted-foreground">
            Nom du point
          </label>
          <input
            id="agent-name"
            name="name"
            required
            placeholder="campus-nord"
            className="mt-2 h-12 w-full rounded-xl border border-border bg-background px-4 outline-none focus:border-primary"
          />
          <FieldError messages={state.errors?.name} />
        </div>
        <div>
          <label htmlFor="agent-printer" className="text-sm font-medium text-muted-foreground">
            Imprimante (facultatif)
          </label>
          <input
            id="agent-printer"
            name="printer_label"
            placeholder="Sharp BP-50C45"
            className="mt-2 h-12 w-full rounded-xl border border-border bg-background px-4 outline-none focus:border-primary"
          />
          <FieldError messages={state.errors?.printer_label} />
        </div>
      </div>

      <SubmitButton pendingLabel="Création…" className="mt-4">
        <Plus className="h-4 w-4" aria-hidden />
        Créer le point
      </SubmitButton>

      <TokenPanel state={state} />
    </form>
  )
}

export function AgentRow({ agent }: { agent: PrintAgent }) {
  const [rotateState, rotateAction] = useActionState(rotateAgentToken, initialFormState)
  const [deleteState, deleteAction] = useActionState(deleteAgent, initialFormState)
  const enLigne = agent.last_status === 'ONLINE'

  return (
    <article className="surface-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-base font-bold">{agent.name}</h3>
          <p className="text-xs text-muted-foreground">
            {agent.printer_label ?? 'Imprimante non précisée'}
          </p>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full px-3 py-1 text-xs font-semibold',
            enLigne ? 'bg-emerald-500/10 text-emerald-700' : 'bg-amber-500/10 text-amber-700',
          )}
        >
          {enLigne ? 'Imprimante en ligne' : (agent.last_status ?? 'Jamais vu')}
        </span>
      </div>

      <p className="mt-3 text-sm text-muted-foreground">
        Dernier contact : {formatCentralDate(agent.last_seen_at)}
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <form action={rotateAction}>
          <input type="hidden" name="name" value={agent.name} />
          <SubmitButton
            pendingLabel="…"
            className="h-10 bg-primary/10 px-4 text-xs text-primary shadow-none hover:bg-primary/15"
          >
            <KeyRound className="h-3.5 w-3.5" aria-hidden />
            Renouveler le jeton
          </SubmitButton>
        </form>

        <form
          action={deleteAction}
          onSubmit={(event) => {
            if (
              !window.confirm(
                `Supprimer le point « ${agent.name} » ?\n\nSon jeton cessera immédiatement de fonctionner : l'agent installé sur place ne pourra plus imprimer.`,
              )
            ) {
              event.preventDefault()
            }
          }}
        >
          <input type="hidden" name="name" value={agent.name} />
          <SubmitButton
            pendingLabel="…"
            className="h-10 bg-destructive/10 px-4 text-xs text-destructive shadow-none hover:bg-destructive/15"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            Supprimer
          </SubmitButton>
        </form>
      </div>

      <TokenPanel state={rotateState} />
      <TokenPanel state={deleteState} />
    </article>
  )
}
