/**
 * Devise d'affichage : l'euro par défaut, le franc CFA pour la zone UEMOA.
 *
 * **La comptabilité ne change pas.** Prix, soldes et paiements restent en
 * francs CFA, la devise des comptes. Ce module ne fait que présenter un
 * montant dans la devise du visiteur.
 *
 * Il le fait **exactement** : le franc CFA ouest-africain a une parité fixe,
 * garantie par le Trésor français, de 655,957 XOF pour 1 EUR, inchangée depuis
 * 1999. Ce n'est pas un cours de marché à rafraîchir — c'est une constante
 * légale, la même que celle de la centrale (`mollie_service.XOF_PAR_EUR`).
 *
 * Module pur, sans `server-only` ni `'use client'` : les mêmes règles servent
 * aux pages rendues par le serveur et aux écrans du navigateur.
 */

export type Devise = 'EUR' | 'XOF'

export const DEVISES: readonly Devise[] = ['EUR', 'XOF']

export const DEVISE_PAR_DEFAUT: Devise = 'EUR'

/** Parité légale fixe. Ne jamais la remplacer par un cours de marché. */
export const XOF_PAR_EUR = 655.957

/** Cookie du choix explicite du visiteur. Lisible par le navigateur. */
export const COOKIE_DEVISE = 'devise'

/**
 * Pays de l'UEMOA, dont la monnaie est le franc CFA ouest-africain (XOF).
 *
 * Volontairement pas la CEMAC (Cameroun, Gabon…) : son franc CFA (XAF) a la
 * même parité, mais c'est une autre monnaie, que FedaPay n'encaisse pas. Un
 * visiteur de Douala voit donc des euros, et peut choisir les F CFA.
 */
export const PAYS_XOF: ReadonlySet<string> = new Set([
  'BJ', // Bénin
  'BF', // Burkina Faso
  'CI', // Côte d'Ivoire
  'GW', // Guinée-Bissau
  'ML', // Mali
  'NE', // Niger
  'SN', // Sénégal
  'TG', // Togo
])

export const LIBELLES: Record<Devise, { court: string; long: string }> = {
  EUR: { court: '€', long: 'Euro' },
  XOF: { court: 'F CFA', long: 'Franc CFA' },
}

/** Devise d'un visiteur d'après son pays de connexion (code ISO à deux lettres). */
export function deviseDuPays(pays: string | null | undefined): Devise {
  return pays && PAYS_XOF.has(pays.trim().toUpperCase()) ? 'XOF' : DEVISE_PAR_DEFAUT
}

/** Valeur lue d'un cookie ou d'un formulaire : une devise connue, ou `null`. */
export function lireDevise(valeur: unknown): Devise | null {
  return valeur === 'EUR' || valeur === 'XOF' ? valeur : null
}

/**
 * Devise d'un libellé venu de la centrale ou de Supabase.
 *
 * La centrale écrit « F CFA » ; certains écrans écrivaient « FCFA ». Tout ce
 * qui n'est pas reconnu est traité comme du franc CFA, la devise des comptes :
 * mieux vaut un montant affiché dans sa devise d'origine qu'une conversion
 * appliquée à tort.
 */
export function deviseDuLibelle(libelle: string | null | undefined): Devise {
  const l = (libelle ?? '').trim().toUpperCase()
  return l === 'EUR' || l === '€' || l === 'EURO' || l === 'EUROS' ? 'EUR' : 'XOF'
}

/** Conversion exacte à la parité fixe. */
export function convertir(montant: number, de: Devise, vers: Devise): number {
  if (de === vers) return montant
  return de === 'XOF' ? montant / XOF_PAR_EUR : montant * XOF_PAR_EUR
}

const FORMAT_XOF = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })

/**
 * Formate un montant **déjà exprimé** dans `devise`.
 *
 * - Franc CFA : entier, il n'a pas de sous-unité.
 * - Euro, un total : au centime **supérieur**. C'est ainsi que la centrale
 *   facture une carte ou PayPal (`mollie_service.en_euros`) : afficher
 *   l'arrondi inférieur annoncerait un centime de moins que le débit réel.
 * - Euro, un prix unitaire (`unitaire`) : jusqu'à trois décimales. Une page à
 *   10 F CFA vaut 0,0152 € ; l'afficher « 0,02 € » ferait croire que dix pages
 *   coûtent 0,20 € au lieu de 0,15 €.
 */
export function formaterMontant(
  montant: number,
  devise: Devise,
  { unitaire = false }: { unitaire?: boolean } = {},
): string {
  if (devise === 'XOF') {
    return `${FORMAT_XOF.format(Math.round(montant))} ${LIBELLES.XOF.court}`
  }
  if (unitaire && Math.abs(montant) < 1) {
    const precis = new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 3,
    })
    return `${precis.format(montant)} ${LIBELLES.EUR.court}`
  }
  // Le centime supérieur, calculé en entiers : `Math.ceil(x * 100)` sur un
  // flottant donne parfois un centime de trop (0,29 * 100 = 28,999…).
  const centimes = Math.ceil(Math.round(montant * 100000) / 1000)
  const total = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${total.format(centimes / 100)} ${LIBELLES.EUR.court}`
}

/** Convertit puis formate : le cas le plus courant. */
export function afficher(
  montant: number,
  source: Devise,
  devise: Devise,
  options?: { unitaire?: boolean },
): string {
  return formaterMontant(convertir(montant, source, devise), devise, options)
}
