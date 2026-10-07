import 'server-only'

import writeXlsxFile from 'write-excel-file/node'

import { JOB_STATUS_LABELS } from './format'
import type { Expediteur } from './types'

/**
 * Classeur Excel de l'activité par expéditeur.
 *
 * Deux feuilles, parce qu'elles répondent à deux questions différentes :
 *
 *   * **Expéditeurs** — une ligne par adresse, pour voir d'un coup d'œil qui
 *     consomme quoi et trier sur n'importe quelle colonne ;
 *   * **Documents** — une ligne par document, l'adresse répétée sur chacune.
 *     Redondant à lire, mais c'est la forme plate qu'attend un tableau croisé
 *     dynamique, et c'est l'usage visé par un export d'analyse.
 *
 * Un vrai `.xlsx` plutôt qu'un CSV : les cellules sont **typées**. Les nombres
 * s'additionnent, les dates se groupent par mois dans un tableau croisé, et il
 * n'y a plus ni question de séparateur, ni d'encodage, ni de risque qu'un nom
 * de fichier commençant par « = » soit pris pour une formule.
 *
 * `server-only` : cette bibliothèque n'a rien à faire dans le navigateur, et
 * l'import échouerait à la compilation si quelqu'un l'y entraînait.
 */

const FORMAT_DATE = 'dd/mm/yyyy hh:mm'
const ENTETE = { fontWeight: 'bold', backgroundColor: '#E8ECF4', align: 'left' } as const

/**
 * Date de la centrale vers un vrai objet Date.
 *
 * Elle arrive en UTC sans fuseau (« 2026-10-01 08:12:44 ») : le `Z` final est
 * indispensable, sans lui le navigateur l'interpréterait en heure locale et
 * décalerait toutes les dates de l'export.
 */
function dateCentrale(valeur: string | null): Date | null {
  if (!valeur) return null
  const d = new Date(`${valeur.replace(' ', 'T')}Z`)
  return Number.isNaN(d.getTime()) ? null : d
}

function cellule(valeur: Date | null) {
  // `null` donne une cellule vide, pas la chaîne « null ».
  return valeur ? { value: valeur, type: Date as DateConstructor, format: FORMAT_DATE } : null
}

function nombre(valeur: number) {
  return { value: valeur, type: Number as NumberConstructor }
}

function feuilleExpediteurs(expediteurs: Expediteur[]) {
  const colonnes = [
    'Expéditeur',
    'Documents',
    'Imprimés',
    'Pages envoyées',
    'Pages sorties',
    'Échecs',
    'Expirés',
    'Paiements',
    'Encaissé',
    'Devise',
    'Premier envoi',
    'Dernier envoi',
  ]

  return {
    sheet: 'Expéditeurs',
    // L'en-tête reste visible quand on fait défiler une longue liste.
    stickyRowsCount: 1,
    columns: [
      { width: 34 }, { width: 12 }, { width: 11 }, { width: 15 }, { width: 14 },
      { width: 9 }, { width: 10 }, { width: 11 }, { width: 13 }, { width: 10 },
      { width: 18 }, { width: 18 },
    ],
    data: [
      colonnes.map((titre) => ({ value: titre, ...ENTETE })),
      ...expediteurs.map((e) => [
        { value: e.email, type: String as StringConstructor },
        nombre(e.documents),
        nombre(e.documents_imprimes),
        nombre(e.pages_envoyees),
        nombre(e.pages_imprimees),
        nombre(e.echecs),
        nombre(e.expires),
        nombre(e.paiements),
        nombre(e.encaisse),
        { value: e.devise ?? '', type: String as StringConstructor },
        cellule(dateCentrale(e.premier_envoi)),
        cellule(dateCentrale(e.dernier_envoi)),
      ]),
    ],
  }
}

function feuilleDocuments(expediteurs: Expediteur[]) {
  const colonnes = [
    'Expéditeur',
    'Document',
    'Fichier',
    'État',
    'Pages',
    'Copies',
    'Pages sorties',
    'Couleur',
    'Recto-verso',
    'Taille (Mo)',
    'Envoyé le',
    'Imprimé le',
    'Point',
    'Erreur',
  ]

  const lignes = expediteurs.flatMap((e) =>
    e.documents_detail.map((d) => [
      { value: e.email, type: String as StringConstructor },
      nombre(d.id),
      { value: d.fichier, type: String as StringConstructor },
      { value: JOB_STATUS_LABELS[d.etat] ?? d.etat, type: String as StringConstructor },
      nombre(d.pages),
      nombre(d.copies),
      nombre(d.pages_sorties),
      { value: d.couleur === 'MONO' ? 'Noir & blanc' : 'Couleur', type: String as StringConstructor },
      { value: d.recto_verso === 'DUPLEX' ? 'Recto verso' : 'Recto', type: String as StringConstructor },
      // Arrondi à deux décimales, mais stocké comme nombre : il reste sommable.
      { value: Math.round((d.taille_octets / (1024 * 1024)) * 100) / 100, type: Number as NumberConstructor, format: '0.00' },
      cellule(dateCentrale(d.envoye_le)),
      cellule(dateCentrale(d.imprime_le)),
      { value: d.point ?? '', type: String as StringConstructor },
      { value: d.erreur ?? '', type: String as StringConstructor },
    ]),
  )

  return {
    sheet: 'Documents',
    stickyRowsCount: 1,
    columns: [
      { width: 30 }, { width: 11 }, { width: 38 }, { width: 20 }, { width: 8 },
      { width: 9 }, { width: 14 }, { width: 14 }, { width: 13 }, { width: 12 },
      { width: 18 }, { width: 18 }, { width: 16 }, { width: 40 },
    ],
    data: [colonnes.map((titre) => ({ value: titre, ...ENTETE })), ...lignes],
  }
}

export async function expediteursVersExcel(expediteurs: Expediteur[]): Promise<Buffer> {
  return writeXlsxFile(
    [feuilleExpediteurs(expediteurs), feuilleDocuments(expediteurs)],
    { fontFamily: 'Calibri', fontSize: 11 },
  ).toBuffer()
}

/** Nom du fichier proposé au téléchargement, période comprise si elle est donnée. */
export function nomDuFichierExcel(depuis?: string, jusqua?: string): string {
  const periode = depuis || jusqua ? `_${depuis || 'debut'}_${jusqua || 'aujourdhui'}` : ''
  return `campus-print_expediteurs${periode}.xlsx`
}
