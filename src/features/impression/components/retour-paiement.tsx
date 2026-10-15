'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { AlertTriangle, CheckCircle2, Loader2, Printer, Wallet, XCircle } from 'lucide-react'

import { formatAmount, getPayment, isPrintApiConfigured, type Payment } from '../api'

/**
 * Écran de retour après un paiement mobile, pour les pages vers lesquelles
 * FedaPay renvoie le client (`/imprimer/paiement`, `/imprimer/portefeuille`).
 *
 * Ces pages annonçaient « Paiement enregistré » à tout le monde, sans rien
 * lire : quelqu'un qui venait d'**annuler** son paiement repartait convaincu
 * d'avoir payé, et se présentait à la borne avec un code qui n'existe pas.
 *
 * Le remède n'est pas de croire l'URL — y arriver ne prouve toujours rien, il
 * suffirait de la taper à la main — mais d'aller demander à la centrale ce qui
 * s'est réellement passé. Rien n'est accordé ici : seul le webhook signé fait
 * foi. Cette page ne fait que **rapporter** le statut qu'elle a lu.
 */

/**
 * Un paiement mobile confirmé met quelques secondes à redescendre du
 * prestataire. On interroge donc un moment avant de conclure, plutôt que
 * d'annoncer « en attente » à quelqu'un qui vient de payer.
 */
const INTERVALLE_MS = 3000
const TOURS_MAX = 20

type Etat =
  | { phase: 'sans-reference' }
  | { phase: 'lecture'; paiement: Payment | null }
  | { phase: 'lu'; paiement: Payment }
  | { phase: 'introuvable' }

export type RetourPaiementProps = {
  /** Ce qu'affiche la page quand l'URL ne porte aucune référence. */
  nature: 'PRINT' | 'TOPUP'
  reference: string
}

/** `?ref=` est ajoutée à la page de retour par la centrale, à la création du paiement. */
export function RetourPaiementDepuisUrl({ nature }: { nature: 'PRINT' | 'TOPUP' }) {
  const params = useSearchParams()
  return <RetourPaiement nature={nature} reference={params.get('ref') ?? ''} />
}

export function RetourPaiement({ nature, reference }: RetourPaiementProps) {
  const [etat, setEtat] = useState<Etat>(
    reference && isPrintApiConfigured
      ? { phase: 'lecture', paiement: null }
      : { phase: 'sans-reference' },
  )

  useEffect(() => {
    if (!reference || !isPrintApiConfigured) return

    let vivant = true
    let tours = 0

    const lire = async () => {
      try {
        const paiement = await getPayment(reference)
        if (!vivant) return
        // Tant que c'est en attente, on repasse : le webhook signé arrive
        // souvent quelques secondes après le retour du navigateur.
        if (paiement.status === 'PENDING' && tours < TOURS_MAX) {
          setEtat({ phase: 'lecture', paiement })
          tours += 1
          setTimeout(lire, INTERVALLE_MS)
          return
        }
        setEtat({ phase: 'lu', paiement })
      } catch {
        if (!vivant) return
        // Référence inconnue ou centrale injoignable : on ne conclut rien.
        setEtat({ phase: 'introuvable' })
      }
    }

    lire()
    return () => {
      vivant = false
    }
  }, [reference])

  if (etat.phase === 'lecture') {
    return (
      <Cadre
        icone={<Loader2 className="h-8 w-8 animate-spin" aria-hidden />}
        titre="Vérification du paiement…"
      >
        <p className="mt-3 text-muted-foreground">
          Nous demandons la confirmation à notre serveur. Gardez cette page ouverte quelques
          secondes.
        </p>
        {etat.paiement ? <Reference valeur={etat.paiement.reference} /> : null}
      </Cadre>
    )
  }

  if (etat.phase === 'lu') {
    const { paiement } = etat
    const montant = formatAmount(paiement.amount, paiement.currency)
    const recharge = (paiement.kind ?? nature) === 'TOPUP'

    if (paiement.status === 'APPROVED') {
      return (
        <Cadre
          ton="success"
          icone={recharge ? <Wallet className="h-8 w-8" aria-hidden /> : <CheckCircle2 className="h-8 w-8" aria-hidden />}
          titre={recharge ? 'Recharge confirmée' : 'Paiement confirmé'}
        >
          {recharge ? (
            <p className="mt-3 text-muted-foreground">
              {montant} ont été crédités sur le portefeuille PrintPoint. Revenez sur
              l&apos;onglet Campus Print resté ouvert : il reprend tout seul, avec le nouveau
              solde.
            </p>
          ) : (
            <p className="mt-3 text-muted-foreground">
              {montant} réglés. Votre code de retrait à 6 chiffres vous a été envoyé par
              e-mail : présentez-le à la borne Campus Print, l&apos;impression démarre quand
              vous êtes devant la machine.
            </p>
          )}
          <Reference valeur={paiement.reference} />
        </Cadre>
      )
    }

    if (paiement.status === 'PENDING') {
      return (
        <Cadre
          ton="attente"
          icone={<AlertTriangle className="h-8 w-8" aria-hidden />}
          titre="Paiement pas encore confirmé"
        >
          <p className="mt-3 text-muted-foreground">
            Notre serveur n&apos;a pas encore reçu la confirmation de {montant}. Si vous avez
            bien validé sur votre téléphone, elle arrive généralement en moins d&apos;une
            minute : rechargez cette page.
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Rien ne vous a été débité tant que le paiement n&apos;est pas confirmé.
          </p>
          <Reference valeur={paiement.reference} />
        </Cadre>
      )
    }

    return (
      <Cadre
        ton="echec"
        icone={<XCircle className="h-8 w-8" aria-hidden />}
        titre="Paiement non abouti"
      >
        <p className="mt-3 text-muted-foreground">
          {paiement.status === 'CANCELED'
            ? 'Vous avez annulé ce paiement.'
            : paiement.status === 'EXPIRED'
              ? 'Ce paiement a expiré avant d’être validé.'
              : 'Votre opérateur a refusé ce paiement.'}{' '}
          {recharge
            ? 'Aucun solde n’a été crédité, et rien ne vous a été débité.'
            : 'Vos documents n’ont pas été réglés, et rien ne vous a été débité.'}
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          {recharge
            ? 'Vous pouvez relancer la recharge depuis la page Recharger mon portefeuille.'
            : 'Reprenez depuis l’onglet Campus Print resté ouvert pour relancer le paiement.'}
        </p>
        <Reference valeur={paiement.reference} />
      </Cadre>
    )
  }

  if (etat.phase === 'introuvable') {
    return (
      <Cadre
        ton="attente"
        icone={<AlertTriangle className="h-8 w-8" aria-hidden />}
        titre="Statut indisponible"
      >
        <p className="mt-3 text-muted-foreground">
          Nous n&apos;avons pas pu joindre notre serveur pour vérifier ce paiement. Rechargez
          cette page dans un instant.
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          Si vous avez payé, votre code de retrait vous parvient par e-mail dès la
          confirmation — cette page n&apos;y change rien.
        </p>
        <Reference valeur={reference} />
      </Cadre>
    )
  }

  // Sans référence dans l'URL : on ne peut rien affirmer, et surtout pas
  // qu'un paiement a eu lieu. On explique où regarder.
  return (
    <Cadre
      icone={nature === 'TOPUP' ? <Wallet className="h-8 w-8" aria-hidden /> : <Printer className="h-8 w-8" aria-hidden />}
      titre={nature === 'TOPUP' ? 'Retour de recharge' : 'Retour de paiement'}
    >
      <p className="mt-3 text-muted-foreground">
        {nature === 'TOPUP'
          ? 'Le solde est crédité dès la confirmation du paiement. Revenez sur l’onglet Campus Print resté ouvert : il reprend tout seul, avec le nouveau solde.'
          : 'Votre code de retrait vous est envoyé par e-mail dès la confirmation du paiement. L’impression démarre à la borne, quand vous y saisissez ce code.'}
      </p>
      <p className="mt-6 text-sm text-muted-foreground">
        Cette page n&apos;a pas reçu de référence de paiement : elle ne peut donc pas vous
        dire où en est le vôtre. En cas de doute, prévenez un responsable du point Campus
        Print avec votre référence sous la main.
      </p>
    </Cadre>
  )
}

const TONS = {
  neutre: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  attente: 'bg-cta/10 text-cta',
  echec: 'bg-destructive/10 text-destructive',
} as const

function Cadre({
  icone,
  titre,
  ton = 'neutre',
  children,
}: {
  icone: React.ReactNode
  titre: string
  ton?: keyof typeof TONS
  children: React.ReactNode
}) {
  return (
    <section className="mx-auto max-w-lg px-4 py-16 text-center sm:py-24">
      <span
        className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${TONS[ton]}`}
      >
        {icone}
      </span>
      <h1 className="mt-6 font-display text-2xl font-extrabold sm:text-3xl">{titre}</h1>
      {children}
    </section>
  )
}

function Reference({ valeur }: { valeur: string }) {
  return (
    <p className="mt-6 font-mono text-xs text-muted-foreground">Référence : {valeur}</p>
  )
}
