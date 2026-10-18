'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, Wallet } from 'lucide-react'

import { cn } from '@/lib/cn'
import { ChoixDuMoyen } from './choix-du-moyen'
import {
  DEFAULT_TOPUP_CONFIG,
  formatAmount,
  getTopUpConfig,
  isPrintApiConfigured,
  PrintApiError,
  topUpWallet,
  type Payment,
} from '../api'

/**
 * Recharge d'un portefeuille PrintPoint, sans document à envoyer.
 *
 * Jusqu'ici, créditer un portefeuille supposait d'avoir d'abord envoyé un
 * fichier : la recharge n'apparaissait qu'au moment où le solde manquait,
 * dans le parcours d'impression. On ne pouvait donc pas préparer son compte à
 * l'avance, ni créditer celui de quelqu'un d'autre.
 *
 * Le solde n'est **pas** affiché ici, et c'est délibéré : l'adresse n'est pas
 * vérifiée, et une page publique qui révélerait le solde de n'importe quelle
 * adresse saisie serait une fuite. Le client voit son solde dans le parcours
 * d'impression, là où il a prouvé qu'il avait accès à sa boîte en recevant son
 * code de retrait.
 */

const INPUT =
  'mt-2 h-12 w-full rounded-xl border border-border bg-background px-4 outline-none focus:border-primary'

export function RechargeForm() {
  const [email, setEmail] = useState('')
  const [config, setConfig] = useState(DEFAULT_TOPUP_CONFIG)
  const [choisi, setChoisi] = useState<number | null>(null)
  const [moyen, setMoyen] = useState('')
  const [busy, setBusy] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [paiement, setPaiement] = useState<Payment | null>(null)

  useEffect(() => {
    if (!isPrintApiConfigured) return
    getTopUpConfig().then(setConfig)
  }, [])

  if (!isPrintApiConfigured) {
    return (
      <div className="surface-card border-primary/20 bg-primary/5 p-6 text-sm">
        <p className="font-medium">Bientôt disponible</p>
        <p className="mt-1 text-muted-foreground">
          La recharge en ligne arrive très prochainement.
        </p>
      </div>
    )
  }

  async function recharger() {
    if (!choisi) return
    setBusy(true)
    setErreur(null)
    try {
      const cree = await topUpWallet(email.trim(), choisi, moyen)
      setPaiement(cree)
      // La page de paiement s'ouvre dans cet onglet : le client y termine, et
      // revient sur /imprimer/portefeuille.
      if (cree.payment_url) window.location.href = cree.payment_url
    } catch (cause) {
      setErreur(
        cause instanceof PrintApiError
          ? cause.message
          : 'La recharge n’a pas pu être lancée. Réessayez dans un instant.',
      )
    } finally {
      setBusy(false)
    }
  }

  // Mode simulé : aucune page de paiement, le solde est déjà crédité.
  if (paiement && !paiement.payment_url) {
    return (
      <div className="surface-card p-6 sm:p-8">
        <CheckCircle2 className="h-10 w-10 text-primary" aria-hidden />
        <h2 className="mt-4 font-display text-xl font-extrabold">Recharge enregistrée</h2>
        <p className="mt-2 text-muted-foreground">
          {formatAmount(paiement.amount, paiement.currency)} crédités sur{' '}
          <strong className="text-foreground">{email.trim()}</strong>.
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          Référence : <span className="font-mono">{paiement.reference}</span>
        </p>
      </div>
    )
  }

  return (
    <div className="surface-card p-6 sm:p-8">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Wallet className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h2 className="font-display text-lg font-bold">Recharger un portefeuille</h2>
          <p className="text-sm text-muted-foreground">
            Le solde se consomme ensuite à l&apos;impression, sans nouveau paiement.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <label htmlFor="recharge-email" className="text-sm font-medium text-muted-foreground">
          Adresse e-mail du portefeuille
        </label>
        <input
          id="recharge-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="prenom.nom@exemple.com"
          className={INPUT}
        />
        <p className="mt-2 text-xs text-muted-foreground">
          La vôtre, ou celle de quelqu&apos;un dont vous voulez créditer le compte.
        </p>
      </div>

      <div className="mt-6">
        <span className="text-sm font-medium text-muted-foreground">Montant</span>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {config.amounts.map((montant) => (
            <button
              key={montant}
              type="button"
              onClick={() => setChoisi(montant)}
              aria-pressed={choisi === montant}
              className={cn(
                'h-12 rounded-xl border text-sm font-semibold transition-colors',
                choisi === montant
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border hover:bg-accent',
              )}
            >
              {formatAmount(montant, config.currency)}
            </button>
          ))}
        </div>
      </div>

      <ChoixDuMoyen
        montant={choisi ?? 0}
        valeur={moyen}
        devise={config.currency}
        onChange={setMoyen}
        surSeuil={(seuil) => (
          <>
            <strong className="text-foreground">Carte bancaire et PayPal</strong> à partir de{' '}
            {seuil}. En dessous, les frais du prestataire dépasseraient la recharge —
            choisissez un montant plus élevé, ou rechargez en Mobile Money.
          </>
        )}
      />

      {/* L'adresse n'est pas vérifiée : un solde crédité à une adresse mal
          saisie appartient à cette adresse, et nous ne pouvons pas le
          déplacer. Le dire avant, pas après. */}
      <p className="mt-6 flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-700" aria-hidden />
        <span>
          <strong>Vérifiez l&apos;adresse avant de payer.</strong> Le solde est crédité à
          l&apos;adresse saisie, et nous ne pouvons pas le déplacer ensuite.
        </span>
      </p>

      {erreur && (
        <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {erreur}
        </p>
      )}

      <button
        type="button"
        onClick={recharger}
        disabled={busy || !choisi || !email.includes('@')}
        className="mt-6 inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-cta px-8 text-base font-medium text-cta-foreground shadow-[var(--shadow-cta)] transition-colors hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            Ouverture du paiement…
          </>
        ) : (
          <>
            <Wallet className="h-5 w-5" aria-hidden />
            {choisi
              ? `Recharger ${formatAmount(choisi, config.currency)}`
              : 'Choisissez un montant'}
          </>
        )}
      </button>

      <p className="mt-4 text-xs text-muted-foreground">
        Le solde est crédité une fois le paiement confirmé, et il ne périme pas.
      </p>
    </div>
  )
}
