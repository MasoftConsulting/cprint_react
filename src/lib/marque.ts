/**
 * La marque du service, en un seul endroit.
 *
 * MASC Print est le projet global. Campus Print n'en est qu'une déclinaison
 * — l'offre destinée aux universités — et d'autres pourront suivre : un
 * déploiement de déclinaison change le nom affiché par
 * `NEXT_PUBLIC_MARQUE_NOM`, sans toucher au code.
 *
 * Ne pas confondre avec les identifiants techniques (`campus-print`,
 * `campus_print`, `CampusPrintAgent-…`) : ceux-là nomment des dépôts, des
 * tâches planifiées et des fichiers déjà installés dans les magasins, et ne
 * changent pas avec la marque.
 */
export const MARQUE = {
  /** Nom affiché partout : en-tête, pied de page, titres, e-mails. */
  nom: process.env.NEXT_PUBLIC_MARQUE_NOM || 'MASC Print',
  /** L'entreprise qui exploite le service. */
  editeur: 'MaSoft Consulting',
  /** Signature courte, sous le nom dans l'en-tête. */
  signature: 'by MaSoft',
  /** La déclinaison destinée aux universités. */
  declinaisonCampus: 'Campus Print',
} as const
