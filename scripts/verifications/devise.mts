/**
 * Règles de la devise d'affichage, vérifiées à chaque poussée.
 *
 * Ce qui compte, et qu'aucun typage ne garantit :
 * - l'euro affiché pour un total est **exactement** ce que la centrale débite
 *   par carte ou PayPal (centime supérieur, à la parité fixe) ;
 * - le franc CFA n'est retenu que pour la zone UEMOA ;
 * - une valeur inconnue ne devient jamais une devise.
 *
 *     node --experimental-strip-types scripts/verifications/devise.mts
 */
import {
  afficher,
  convertir,
  deviseDuLibelle,
  deviseDuPays,
  lireDevise,
  prixDeZone,
  XOF_PAR_EUR,
} from '../../src/features/devise/devise.ts'

let ok = 0
let echecs = 0
function verifier(libelle: string, condition: boolean, detail = '') {
  if (condition) ok++
  else echecs++
  console.log(`${condition ? '  OK   ' : '  ECHEC'} ${libelle}${condition ? '' : ` -> ${detail}`}`)
}
// Les espaces de mise en forme (insécables, fines) deviennent ordinaires.
const net = (texte: string) => texte.replace(/[  ]/g, ' ')

// --- Ce que la centrale débite (mollie_service.en_euros), relevé le 23/10 ---
const CENTRALE: Record<number, string> = {
  10: '0,02 €', 100: '0,16 €', 160: '0,25 €', 500: '0,77 €', 1000: '1,53 €',
  1312: '2,01 €', 2000: '3,05 €', 5000: '7,63 €', 10000: '15,25 €', 123456: '188,21 €',
}
for (const [xof, eur] of Object.entries(CENTRALE)) {
  const ecran = net(afficher(Number(xof), 'XOF', 'EUR'))
  verifier(`${xof} F CFA s'affiche comme la centrale le débite (${eur})`, ecran === eur, ecran)
}
verifier('la parité est la parité légale', XOF_PAR_EUR === 655.957, String(XOF_PAR_EUR))
verifier('1 € vaut exactement 655,957 F CFA', convertir(1, 'EUR', 'XOF') === 655.957)
verifier('aller-retour sans perte', Math.abs(convertir(convertir(777, 'XOF', 'EUR'), 'EUR', 'XOF') - 777) < 1e-9)

// --- Prix unitaires : pas d'arrondi trompeur ---
verifier('10 F CFA la page : 0,015 €, pas 0,02 €', net(afficher(10, 'XOF', 'EUR', { unitaire: true })) === '0,015 €',
  afficher(10, 'XOF', 'EUR', { unitaire: true }))
verifier('le franc CFA reste entier', net(afficher(5000, 'XOF', 'XOF')) === '5 000 F CFA', afficher(5000, 'XOF', 'XOF'))

// --- Zone géographique ---
for (const pays of ['TG', 'BJ', 'CI', 'SN', 'ML', 'BF', 'NE', 'GW', 'tg', ' TG ']) {
  verifier(`${pays.trim() || '(vide)'} : franc CFA`, deviseDuPays(pays) === 'XOF', deviseDuPays(pays))
}
// La CEMAC a son propre franc CFA (XAF), que FedaPay n'encaisse pas.
for (const pays of ['FR', 'BE', 'CM', 'GA', 'US', '', null, undefined]) {
  verifier(`${pays || '(inconnu)'} : euro`, deviseDuPays(pays) === 'EUR', deviseDuPays(pays))
}

// --- Valeurs venues d'un cookie ou d'un formulaire ---
verifier('EUR et XOF sont reconnus', lireDevise('EUR') === 'EUR' && lireDevise('XOF') === 'XOF')
for (const valeur of ['USD', 'eur', '', null, undefined, 42]) {
  verifier(`${JSON.stringify(valeur)} n'est pas une devise`, lireDevise(valeur) === null)
}
verifier('le libellé de la centrale « F CFA » est du franc CFA', deviseDuLibelle('F CFA') === 'XOF')
verifier('« FCFA » aussi', deviseDuLibelle('FCFA') === 'XOF')
verifier('« EUR » est de l’euro', deviseDuLibelle('EUR') === 'EUR')
// Un libellé inconnu n'est pas converti : mieux vaut sa devise d'origine
// qu'une conversion appliquée à tort.
verifier('un libellé inconnu n’est pas converti', deviseDuLibelle('???') === 'XOF')

// --- Prix de zone : même règle que la centrale (pricing_service.get_pricing) ---
const sansEuro = { nb: 10, couleur: 50, livret: 100, eur: null }
const avecEuro = { nb: 10, couleur: 50, livret: 100, eur: { nb: 0.1, couleur: 0.5, livret: 0.5 } }
const z1 = prixDeZone(avecEuro, 'EUR')
verifier('zone euro tarifée : 0,10 € la page, en euros', z1.mono === 0.1 && z1.devise === 'EUR', JSON.stringify(z1))
verifier('et 0,50 € la couleur', z1.couleur === 0.5)
const z2 = prixDeZone(sansEuro, 'EUR')
verifier('zone euro sans prix : ceux de la zone F CFA, comme la centrale',
  z2.mono === 10 && z2.devise === 'XOF', JSON.stringify(z2))
verifier('donc affichés convertis : 0,015 €', net(afficher(z2.mono, z2.devise, 'EUR', { unitaire: true })) === '0,015 €')
verifier('zone euro tarifée, affichée telle quelle : 0,10 €',
  net(afficher(z1.mono, z1.devise, 'EUR', { unitaire: true })) === '0,10 €',
  afficher(z1.mono, z1.devise, 'EUR', { unitaire: true }))
verifier('12 pages à 0,10 € : 1,20 €, pas 1,21 €', net(afficher(12 * z1.mono, 'EUR', 'EUR')) === '1,20 €',
  afficher(12 * z1.mono, 'EUR', 'EUR'))
const z3 = prixDeZone({ ...avecEuro, eur: { nb: 0.1, couleur: 0.5, livret: null } }, 'EUR')
verifier('livret euro absent : supplément F CFA converti', Math.abs(z3.livret - 100 / XOF_PAR_EUR) < 1e-12, String(z3.livret))
verifier('zone F CFA inchangée', prixDeZone(avecEuro, 'XOF').mono === 10)

console.log(`\n${ok} vérifications passées, ${echecs} en échec`)
process.exit(echecs ? 1 : 0)
