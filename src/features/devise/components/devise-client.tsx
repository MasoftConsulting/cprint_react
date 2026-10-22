'use client'

import { useEffect, useSyncExternalStore } from 'react'

import { choisirDevise } from '../actions'
import {
  COOKIE_DEVISE,
  DEVISES,
  DEVISE_PAR_DEFAUT,
  LIBELLES,
  afficher,
  deviseDuLibelle,
  lireDevise,
  type Devise,
} from '../devise'

/*
 * La devise courante, partagée par tous les écrans du navigateur.
 *
 * Elle est posée par le sélecteur de l'en-tête, qui la reçoit du serveur
 * (choix mémorisé, sinon pays de connexion). Les écrans du parcours
 * d'impression, rendus dans le navigateur, la lisent ici : ils n'ont pas
 * accès aux en-têtes de la requête.
 */
let courante: Devise | null = null
const abonnes = new Set<() => void>()

function lireCookie(): Devise | null {
  const trouve = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_DEVISE}=([^;]+)`))
  return lireDevise(trouve?.[1])
}

function definir(devise: Devise) {
  if (courante === devise) return
  courante = devise
  for (const abonne of abonnes) abonne()
}

function sAbonner(abonne: () => void) {
  abonnes.add(abonne)
  return () => {
    abonnes.delete(abonne)
  }
}

/**
 * Devise d'affichage du visiteur.
 *
 * `initiale` : la devise que le serveur a déjà employée pour rendre ce
 * composant, s'il la connaissait. Elle sert à l'hydratation, pour que la page
 * ne change pas de devise sous les yeux du visiteur à l'instant où elle
 * devient interactive.
 */
export function useDevise(initiale?: Devise): Devise {
  return useSyncExternalStore(
    sAbonner,
    () => courante ?? lireCookie() ?? initiale ?? DEVISE_PAR_DEFAUT,
    () => initiale ?? DEVISE_PAR_DEFAUT,
  )
}

/**
 * Les deux façons d'afficher un montant venu de la centrale.
 *
 * - `affiche` : un montant d'information (prix, solde), dans la devise du
 *   visiteur.
 * - `debite` : ce qui va **réellement** quitter le compte du client. Le Mobile
 *   Money débite des F CFA, la carte et PayPal des euros : on annonce d'abord
 *   le montant dans la devise du débit, puis son équivalent si le visiteur
 *   lit une autre devise. Annoncer « 1,53 € » pour un débit Mobile Money de
 *   1 000 F CFA ferait chercher au client une transaction en euros qui
 *   n'existe pas.
 */
export function useMontants(initiale?: Devise) {
  const devise = useDevise(initiale)
  return {
    devise,
    affiche(montant: number, libelleSource: string, options?: { unitaire?: boolean }) {
      return afficher(montant, deviseDuLibelle(libelleSource), devise, options)
    },
    debite(montant: number, libelleSource: string, devisePaiement: Devise) {
      const source = deviseDuLibelle(libelleSource)
      const principal = afficher(montant, source, devisePaiement)
      return devisePaiement === devise
        ? principal
        : `${principal} (≈ ${afficher(montant, source, devise)})`
    },
  }
}

/** Devise débitée par un paiement déjà créé, d'après son prestataire. */
export function deviseDuPaiement(provider: string): Devise {
  return provider === 'MOLLIE' ? 'EUR' : 'XOF'
}

/** Devise débitée par un moyen de paiement choisi dans `ChoixDuMoyen`. */
export function deviseDuMoyen(code: string): Devise {
  // Mollie (carte, PayPal…) encaisse en euros ; le Mobile Money, en F CFA.
  return code.startsWith('mollie:') ? 'EUR' : 'XOF'
}

/**
 * Sélecteur € / F CFA de l'en-tête.
 *
 * Un formulaire, et non de simples boutons : sans JavaScript, il fonctionne
 * quand même (le serveur pose le cookie et renvoie la page convertie). Avec,
 * les écrans du navigateur basculent aussitôt, sans attendre l'aller-retour.
 */
export function SelecteurDevise({ initiale }: { initiale: Devise }) {
  // La devise résolue par le serveur (choix, sinon pays) devient la devise
  // courante du navigateur : c'est d'elle que partent les autres écrans.
  useEffect(() => {
    if (!lireCookie()) definir(initiale)
  }, [initiale])

  const devise = useDevise(initiale)

  return (
    <form action={choisirDevise} className="flex items-center rounded-xl border border-border p-0.5 text-xs font-semibold">
      <span className="sr-only">Devise d&apos;affichage</span>
      {DEVISES.map((d) => (
        <button
          key={d}
          type="submit"
          name="devise"
          value={d}
          onClick={() => definir(d)}
          aria-pressed={devise === d}
          title={LIBELLES[d].long}
          className={
            devise === d
              ? 'h-8 rounded-lg bg-primary px-2.5 text-primary-foreground'
              : 'h-8 rounded-lg px-2.5 text-muted-foreground hover:text-foreground'
          }
        >
          {LIBELLES[d].court}
        </button>
      ))}
    </form>
  )
}

/** Place réservée pendant que le serveur résout la devise : pas de saut de mise en page. */
export function SelecteurDeviseSquelette() {
  return <div aria-hidden className="h-9 w-[5.5rem] rounded-xl border border-border" />
}
