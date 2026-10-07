import { JOB_STATUS_LABELS } from './format'
import type { Expediteur } from './types'

/**
 * Export CSV de l'activité par expéditeur, une ligne par document.
 *
 * Forme volontairement **plate** : les totaux de l'expéditeur sont répétés sur
 * chacune de ses lignes. C'est redondant à lire, mais c'est ce qui permet de
 * construire un tableau croisé dynamique sans rien retravailler — et c'est
 * l'usage visé par un export d'analyse.
 *
 * Deux choix dictés par Excel en français, et non par le standard CSV :
 *
 *   * **séparateur `;`** — avec `,`, Excel francophone met toute la ligne dans
 *     une seule cellule, la virgule étant déjà le séparateur décimal ;
 *   * **BOM UTF-8 en tête** — sans lui, Excel lit le fichier en ANSI et tous
 *     les accents deviennent illisibles.
 */

const SEPARATEUR = ';'

const COLONNES = [
  'Expéditeur',
  'Documents (expéditeur)',
  'Pages envoyées (expéditeur)',
  'Pages imprimées (expéditeur)',
  'Encaissé (expéditeur)',
  'Devise',
  'Premier envoi',
  'Dernier envoi',
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
] as const

/**
 * Échappe une valeur pour une cellule CSV.
 *
 * Le préfixe sur `=`, `+`, `-` et `@` n'est pas de la coquetterie : un nom de
 * fichier commençant par l'un d'eux serait interprété par Excel comme une
 * formule à l'ouverture. C'est une injection de formule, et un nom de fichier
 * vient du client.
 */
function cellule(valeur: string | number | null): string {
  if (valeur === null || valeur === undefined) return ''
  let texte = String(valeur)
  if (/^[=+\-@]/.test(texte)) texte = `'${texte}`
  if (texte.includes('"') || texte.includes(SEPARATEUR) || /[\r\n]/.test(texte)) {
    return `"${texte.replace(/"/g, '""')}"`
  }
  return texte
}

/** Date de la centrale (UTC, « 2026-10-01 08:12:44 ») en heure locale lisible. */
function date(valeur: string | null): string {
  if (!valeur) return ''
  const d = new Date(`${valeur.replace(' ', 'T')}Z`)
  if (Number.isNaN(d.getTime())) return valeur
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

/** Nombre décimal au format francophone : la virgule, qu'Excel attend. */
function nombre(valeur: number, decimales = 0): string {
  return valeur.toFixed(decimales).replace('.', ',')
}

export function expediteursVersCsv(expediteurs: Expediteur[]): string {
  const lignes: string[] = [COLONNES.join(SEPARATEUR)]

  for (const e of expediteurs) {
    const colonnesExpediteur = [
      cellule(e.email),
      cellule(e.documents),
      cellule(e.pages_envoyees),
      cellule(e.pages_imprimees),
      cellule(nombre(e.encaisse, 2)),
      cellule(e.devise),
      cellule(date(e.premier_envoi)),
      cellule(date(e.dernier_envoi)),
    ]

    if (e.documents_detail.length === 0) {
      // Un expéditeur sans détail garde sa ligne : il compte dans l'analyse.
      lignes.push([...colonnesExpediteur, ...Array(COLONNES.length - 8).fill('')].join(SEPARATEUR))
      continue
    }

    for (const d of e.documents_detail) {
      lignes.push(
        [
          ...colonnesExpediteur,
          cellule(d.id),
          cellule(d.fichier),
          cellule(JOB_STATUS_LABELS[d.etat] ?? d.etat),
          cellule(d.pages),
          cellule(d.copies),
          cellule(d.pages_sorties),
          cellule(d.couleur === 'MONO' ? 'Noir & blanc' : 'Couleur'),
          cellule(d.recto_verso === 'DUPLEX' ? 'Recto verso' : 'Recto'),
          cellule(nombre(d.taille_octets / (1024 * 1024), 2)),
          cellule(date(d.envoye_le)),
          cellule(date(d.imprime_le)),
          cellule(d.point),
          cellule(d.erreur),
        ].join(SEPARATEUR),
      )
    }
  }

  // \r\n : fin de ligne attendue par Excel sous Windows.
  return lignes.join('\r\n')
}

/** Nom du fichier proposé au téléchargement, période comprise si elle est donnée. */
export function nomDuFichierCsv(depuis?: string, jusqua?: string): string {
  const periode = depuis || jusqua ? `_${depuis || 'debut'}_${jusqua || 'aujourdhui'}` : ''
  return `campus-print_expediteurs${periode}.csv`
}
