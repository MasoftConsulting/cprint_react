'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Pencil, Wallet as WalletIcon } from 'lucide-react'

import { FieldError } from '@/components/ui/field-error'
import { SubmitButton } from '@/components/ui/submit-button'
import { initialFormState, type FormState } from '@/lib/form-state'
import { cn } from '@/lib/cn'
import { adjustWallet } from '@/features/impressions/actions'
import { formatCentralDate } from '@/features/impressions/format'
import type { Wallet } from '@/features/impressions/types'

/**
 * Portefeuilles PrintPoint : un solde en **argent**, rechargé par le client
 * lui-même en ligne.
 *
 * Il n'y a donc volontairement pas de bouton « recharger » ici, contrairement
 * aux comptes à crédit : une recharge est un paiement, et elle appartient au
 * client. Cette administration constate, et corrige par un ajustement — qui
 * exige une note, parce qu'il n'a aucune trace de paiement derrière lui.
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

/** Montant dans la devise de la centrale, sans jamais supposer laquelle. */
export function formatMontant(montant: number, devise: string) {
  return `${montant.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ${devise}`
}

export function WalletRow({ wallet }: { wallet: Wallet }) {
  const [state, formAction] = useActionState(adjustWallet, initialFormState)
  const aSec = wallet.balance <= 0

  return (
    <article className="surface-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-base font-bold break-all">{wallet.email}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            ouvert le {formatCentralDate(wallet.created_at)} · dernier mouvement le{' '}
            {formatCentralDate(wallet.updated_at)}
          </p>
        </div>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold',
            aSec ? 'bg-muted text-muted-foreground' : 'bg-emerald-500/10 text-emerald-700',
          )}
        >
          <WalletIcon className="h-4 w-4" aria-hidden />
          {formatMontant(wallet.balance, wallet.currency)}
        </span>
      </div>

      <p className="mt-3 text-sm text-muted-foreground">
        {formatMontant(wallet.total_recharge, wallet.currency)} rechargés ·{' '}
        {formatMontant(wallet.total_depense, wallet.currency)} imprimés ·{' '}
        <Link
          href={`/admin/impressions/portefeuilles/${encodeURIComponent(wallet.email)}`}
          className="font-medium text-primary hover:underline"
        >
          {wallet.mouvements} mouvement{wallet.mouvements > 1 ? 's' : ''}
        </Link>
      </p>

      {aSec && (
        <p className="mt-3 rounded-xl border border-border bg-secondary/40 p-3 text-sm text-muted-foreground">
          Solde épuisé : ce client paie normalement tant qu&apos;il n&apos;a pas rechargé. Son
          portefeuille reste ouvert, et le solde ne périme pas.
        </p>
      )}

      <form action={formAction} className="mt-4 flex flex-wrap items-end gap-2">
        <input type="hidden" name="email" value={wallet.email} />
        <div>
          <label
            htmlFor={`montant-${wallet.email}`}
            className="text-xs font-medium text-muted-foreground"
          >
            Ajuster de
          </label>
          <input
            id={`montant-${wallet.email}`}
            name="montant"
            type="number"
            step="any"
            required
            placeholder="500"
            className="mt-1 h-10 w-28 rounded-xl border border-border bg-background px-3 outline-none focus:border-primary"
          />
        </div>
        <div>
          <label
            htmlFor={`note-wallet-${wallet.email}`}
            className="text-xs font-medium text-muted-foreground"
          >
            Motif (obligatoire)
          </label>
          <input
            id={`note-wallet-${wallet.email}`}
            name="note"
            required
            placeholder="Recharge encaissée en espèces"
            className="mt-1 h-10 w-56 rounded-xl border border-border bg-background px-3 outline-none focus:border-primary"
          />
        </div>
        <SubmitButton
          pendingLabel="…"
          className="h-10 bg-primary/10 px-4 text-xs text-primary shadow-none hover:bg-primary/15"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden />
          Ajuster
        </SubmitButton>
      </form>

      <FieldError messages={state.errors?.montant} />
      <FieldError messages={state.errors?.note} />
      <Message state={state} />
    </article>
  )
}
