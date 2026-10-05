import { formatSize, type UploadLimits } from './api'

/**
 * Règles de téléversement appliquées dans le navigateur, avant l'envoi.
 *
 * Elles doublent celles de la centrale (`document_service.prepare_upload`)
 * dans un seul but : éviter au client d'attendre la fin d'un téléversement en
 * 4G pour apprendre qu'un fichier était trop lourd. **La centrale revérifie
 * tout** — ce tri est un confort, jamais une garantie, et il ne doit donc
 * jamais être plus permissif qu'elle.
 *
 * Fonction pure, hors de tout composant : c'est la seule partie du formulaire
 * qui mérite d'être vérifiée pièce à pièce.
 */

export type TriFichiers = {
  /** Ce qui peut partir. */
  retenus: File[]
  /** Pourquoi le reste a été écarté, en phrases destinées au client. */
  ecartes: string[]
}

export function trierFichiers(choisis: File[], limites: UploadLimits): TriFichiers {
  const retenus: File[] = []
  const ecartes: string[] = []
  const maxOctets = limites.maxFileSizeMb * 1024 * 1024

  for (const file of choisis) {
    if (file.size === 0) {
      // La centrale répond « fichier vide, ignore » : autant le dire avant.
      ecartes.push(`« ${file.name} » est vide.`)
    } else if (file.size > maxOctets) {
      ecartes.push(
        `« ${file.name} » fait ${formatSize(file.size)}, la limite est de ${limites.maxFileSizeMb} Mo.`,
      )
    } else if (retenus.length >= limites.maxFiles) {
      // Le dépassement se juge sur ce qui est RETENU, pas sur la sélection :
      // deux fichiers trop lourds ne doivent pas consommer deux places.
      ecartes.push(`« ${file.name} » : ${limites.maxFiles} documents au maximum par envoi.`)
    } else {
      retenus.push(file)
    }
  }

  return { retenus, ecartes }
}
