'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Pause, Play, Plus, Wallet } from 'lucide-react'

import { FieldError } from '@/components/ui/field-error'
import { SubmitButton } from '@/components/ui/submit-button'
import { initialFormState, type FormState } from '@/lib/form-state'
import { cn } from '@/lib/cn'
import {
  createCreditAccount,
  setCreditAccountActive,
  topUpCreditAccount,
} from '@/features/impressions/actions'
import { formatCentralDate } from '@/features/impressions/format'
import type { CreditAccount } from '@/features/impressions/types'

/**
 * Comptes à crédit : ouverture, recharge, suspension.
 *
 * Le solde est en **pages noir & blanc**. Une page couleur en consomme 2, et
 * ce calcul appartient à la centrale — cet écran n'en fait aucun, il se
 * contente d'afficher ce qu'elle renvoie.
 */

function Message({ state }: { state: FormState }) {
  if (state.status === 'idle' || !state.message) return null
  return (
    <p
      className={cn(
        'mt-3 rounded-xl border p-3 text-sm',
        state.status === 'success'
          ? 'border-primary/30 bg-primary/5'
          : 'border-destructive/30 bg-destructive/10 text-destructive',
      )}
    >
      {state.message}
    </p>
  )
}

export function CreateCreditForm() {
  const [state, formAction] = useActionState(createCreditAccount, initialFormState)

  return (
    <form action={formAction} className="surface-card p-6 sm:p-8">
      <h2 className="font-display text-lg font-bold">Ouvrir un compte à crédit</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Cette adresse imprimera sans payer, sur le solde que vous lui créditez. Les autres
        clients continuent de payer normalement.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="credit-email" className="text-sm font-medium text-muted-foreground">
            Adresse e-mail
          </label>
          <input
            id="credit-email"
            name="email"
            type="email"
            required
            placeholder="dept.lettres@univ-lome.tg"
            className="mt-2 h-12 w-full rounded-xl border border-border bg-background px-4 outline-none focus:border-primary"
          />
          <FieldError messages={state.errors?.email} />
        </div>
        <div>
          <label htmlFor="credit-label" className="text-sm font-medium text-muted-foreground">
            Intitulé (facultatif)
          </label>
          <input
            id="credit-label"
            name="label"
            placeholder="Université de Lomé — Lettres"
            className="mt-2 h-12 w-full rounded-xl border border-border bg-background px-4 outline-none focus:border-primary"
          />
          <FieldError messages={state.errors?.label} />
        </div>
        <div>
          <label htmlFor="credit-pages" className="text-sm font-medium text-muted-foreground">
            Solde initial (pages)
          </label>
          <input
            id="credit-pages"
            name="pages"
            type="number"
            min={0}
            defaultValue={0}
            className="mt-2 h-12 w-full rounded-xl border border-border bg-background px-4 outline-none focus:border-primary"
          />
          <FieldError messages={state.errors?.pages} />
          <p className="mt-1 text-xs text-muted-foreground">
            En pages noir &amp; blanc. Une page couleur en consomme 2.
          </p>
        </div>
      </div>

      <SubmitButton pendingLabel="Ouverture…" className="mt-4">
        <Plus className="h-4 w-4" aria-hidden />
        Ouvrir le compte
      </SubmitButton>

      <Message state={state} />
    </form>
  )
}

export function CreditRow({ account }: { account: CreditAccount }) {
  const [topUpState, topUpAction] = useActionState(topUpCreditAccount, initialFormState)
  const [activeState, activeAction] = useActionState(setCreditAccountActive, initialFormState)
  const aSec = account.pages_balance <= 0

  return (
    <article className={cn('surface-card p-6', !account.active && 'opacity-70')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-base font-bold break-all">{account.email}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {account.label ?? 'Sans intitulé'} · ouvert le {formatCentralDate(account.created_at)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold',
              aSec
                ? 'bg-destructive/10 text-destructive'
                : 'bg-emerald-500/10 text-emerald-700',
            )}
          >
            <Wallet className="h-4 w-4" aria-hidden />
            {account.pages_balance} page{Math.abs(account.pages_balance) > 1 ? 's' : ''}
          </span>
          {!account.active && (
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
              Suspendu
            </span>
          )}
        </div>
      </div>

      <p className="mt-3 text-sm text-muted-foreground">
        {account.pages_consommees} page{account.pages_consommees > 1 ? 's' : ''} consommée
        {account.pages_consommees > 1 ? 's' : ''} ·{' '}
        <Link
          href={`/admin/impressions/credits/${encodeURIComponent(account.email)}`}
          className="font-medium text-primary hover:underline"
        >
          {account.mouvements} mouvement{account.mouvements > 1 ? 's' : ''}
        </Link>
      </p>

      {aSec && account.active && (
        <p className="mt-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          Solde épuisé : ce compte paiera normalement tant qu&apos;il n&apos;est pas rechargé.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <form action={topUpAction} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="email" value={account.email} />
          <div>
            <label
              htmlFor={`pages-${account.email}`}
              className="text-xs font-medium text-muted-foreground"
            >
              Recharger de
            </label>
            <input
              id={`pages-${account.email}`}
              name="pages"
              type="number"
              required
              placeholder="500"
              className="mt-1 h-10 w-28 rounded-xl border border-border bg-background px-3 outline-none focus:border-primary"
            />
          </div>
          <div>
            <label
              htmlFor={`note-${account.email}`}
              className="text-xs font-medium text-muted-foreground"
            >
              Note
            </label>
            <input
              id={`note-${account.email}`}
              name="note"
              placeholder="Facture 2026-04"
              className="mt-1 h-10 w-44 rounded-xl border border-border bg-background px-3 outline-none focus:border-primary"
            />
          </div>
          <SubmitButton
            pendingLabel="…"
            className="h-10 bg-primary/10 px-4 text-xs text-primary shadow-none hover:bg-primary/15"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Créditer
          </SubmitButton>
        </form>

        <form action={activeAction}>
          <input type="hidden" name="email" value={account.email} />
          <input type="hidden" name="actif" value={account.active ? 'false' : 'true'} />
          <SubmitButton
            pendingLabel="…"
            className="h-10 bg-secondary px-4 text-xs text-foreground shadow-none hover:bg-secondary/70"
          >
            {account.active ? (
              <>
                <Pause className="h-3.5 w-3.5" aria-hidden />
                Suspendre
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" aria-hidden />
                Réactiver
              </>
            )}
          </SubmitButton>
        </form>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        Un nombre négatif retire des pages — pour corriger une erreur de saisie.
      </p>

      <Message state={topUpState} />
      <Message state={activeState} />
    </article>
  )
}
