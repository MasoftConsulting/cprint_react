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
 *
 * Prend les variations brutes, et non les mouvements : le même calcul sert aux
 * comptes à crédit (en pages, entières) et aux portefeuilles PrintPoint (en
 * argent). D'où l'arrondi au centième — sans lui, une succession de
 * soustractions flottantes afficherait « 749.9999999999999 ».
 */
export function soldesSuccessifs(variations: number[], soldeActuel: number): number[] {
  const soldes: number[] = []
  let courant = soldeActuel
  for (const variation of variations) {
    soldes.push(courant)
    courant = Math.round((courant - variation) * 100) / 100
  }
  return soldes
}
