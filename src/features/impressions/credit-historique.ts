import type { CreditMovement } from './types'

/**
 * Solde après chaque mouvement, reconstitué depuis le solde courant.
 *
 * Les mouvements arrivent du plus récent au plus ancien. Le solde après le
 * premier de la liste est donc le solde actuel ; celui d'après se déduit en
 * retirant la variation du mouvement qu'on vient de passer.
 *
 * Remonter depuis le solde actuel plutôt que cumuler depuis le plus ancien
 * n'est pas un détail : la centrale tronque l'historique à 100 mouvements, et
 * un cumul vers l'avant partirait alors d'un solde initial inconnu. Ici, seules
 * les lignes affichées comptent, et chacune est juste.
 */
export function soldesSuccessifs(
  mouvements: Pick<CreditMovement, 'pages'>[],
  soldeActuel: number,
): number[] {
  const soldes: number[] = []
  let courant = soldeActuel
  for (const mouvement of mouvements) {
    soldes.push(courant)
    courant -= mouvement.pages
  }
  return soldes
}
