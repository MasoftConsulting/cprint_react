/**
 * Retour à la page d'appel après un paiement.
 *
 * Ce qui compte : la page de retour ne renvoie **que** vers une page de ce
 * site. Une adresse extérieure mémorisée (ou glissée dans le stockage de
 * l'onglet) ferait de `/imprimer/paiement` une redirection ouverte.
 *
 *     node --experimental-strip-types scripts/verifications/retour.mts
 */
const stockage = new Map<string, string>()
;(globalThis as { sessionStorage?: unknown }).sessionStorage = {
  getItem: (cle: string) => stockage.get(cle) ?? null,
  setItem: (cle: string, valeur: string) => void stockage.set(cle, valeur),
}

const { avecPaiement, lireRetour, memoriserRetour } = await import('../../src/features/impression/retour.ts')

let ok = 0
let echecs = 0
function verifier(libelle: string, condition: boolean, detail = '') {
  if (condition) ok++
  else echecs++
  console.log(`${condition ? '  OK   ' : '  ECHEC'} ${libelle}${condition ? '' : ` -> ${detail}`}`)
}

memoriserRetour('CP-1', '/imprimer?session=abc')
verifier('une page du site est retenue', lireRetour('CP-1') === '/imprimer?session=abc', String(lireRetour('CP-1')))
verifier('par paiement : une autre référence n’a rien', lireRetour('CP-2') === null)

for (const externe of ['https://exemple.test/', '//exemple.test/x', 'javascript:alert(1)', 'imprimer']) {
  memoriserRetour('CP-X', externe)
  verifier(`« ${externe} » n'est jamais mémorisée`, lireRetour('CP-X') === null, String(lireRetour('CP-X')))
}
// Même glissée directement dans le stockage, elle n'est pas relue.
stockage.set('retour-paiement:CP-Y', '//exemple.test/piege')
verifier('une adresse extérieure glissée dans le stockage est ignorée', lireRetour('CP-Y') === null)

verifier('la référence s’ajoute à une adresse avec paramètres',
  avecPaiement('/imprimer?session=abc', 'CP-1') === '/imprimer?session=abc&paiement=CP-1',
  avecPaiement('/imprimer?session=abc', 'CP-1'))
verifier('et à une adresse sans paramètres',
  avecPaiement('/recharge', 'CP-1') === '/recharge?paiement=CP-1', avecPaiement('/recharge', 'CP-1'))

console.log(`\n${ok} vérifications passées, ${echecs} en échec`)
process.exit(echecs ? 1 : 0)
