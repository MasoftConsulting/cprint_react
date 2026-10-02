/**
 * Comptes du back-office, tels qu'on les montre.
 *
 * Ce fichier ne contient que des types : il est importable depuis un composant
 * client, contrairement à `queries.ts` qui est `server-only` (il porte la clé
 * `service_role`).
 */

export type BoardUser = {
  id: string
  email: string
  /** `user_metadata.name`, ou la partie avant l'arobase à défaut. */
  name: string
  createdAt: string
  lastSignInAt: string | null
  /** Adresse confirmée : un compte invité mais jamais activé se voit ainsi. */
  emailConfirmed: boolean
  /** A accès à la section Impressions (voir features/impressions/access.ts). */
  canPrint: boolean
}

export type BoardUsers = {
  users: BoardUser[]
  /**
   * `PRINT_ADMIN_EMAILS` non vide : l'accès aux impressions est restreint à
   * une liste. `false` = tout compte admin y accède, c'est le repli.
   */
  printRestricted: boolean
  /**
   * Adresses listées dans `PRINT_ADMIN_EMAILS` qui ne correspondent à aucun
   * compte : presque toujours une faute de frappe, qui prive silencieusement
   * quelqu'un de son accès.
   */
  unknownAllowedEmails: string[]
}

/**
 * Trois états possibles, parce que deux d'entre eux ne sont pas des pannes :
 * la clé `service_role` est facultative, et son absence doit s'expliquer à
 * l'écran plutôt que de ressembler à un bug.
 */
export type BoardUsersResult =
  | ({ status: 'ok' } & BoardUsers)
  | { status: 'cle-absente' }
  | { status: 'erreur'; message: string }
