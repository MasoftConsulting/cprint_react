import { AlertTriangle, Printer, ShieldCheck, ShieldOff, Users } from 'lucide-react'

import { cn } from '@/lib/cn'
import { formatDateIso, formatDepuis } from '@/features/utilisateurs/format'
import type { BoardUsers } from '@/features/utilisateurs/types'

/**
 * Les comptes du back-office, et qui a accès aux impressions.
 *
 * Composant **serveur** : rien n'est interactif ici, et les adresses des
 * collègues n'ont pas besoin de traverser la frontière dans un état client.
 */

function BadgeImpression({ autorise }: { autorise: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        autorise ? 'bg-emerald-500/10 text-emerald-700' : 'bg-muted text-muted-foreground',
      )}
    >
      {autorise ? (
        <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
      ) : (
        <ShieldOff className="h-3.5 w-3.5" aria-hidden />
      )}
      {autorise ? 'Autorisé' : 'Non autorisé'}
    </span>
  )
}

export function UsersBoard({
  users,
  printRestricted,
  unknownAllowedEmails,
  currentUserId,
}: BoardUsers & { currentUserId: string }) {
  const autorises = users.filter((user) => user.canPrint).length

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="surface-card p-6">
          <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Users className="h-4 w-4 text-primary" aria-hidden />
            Comptes du back-office
          </p>
          <p className="mt-2 font-display text-3xl font-extrabold">{users.length}</p>
        </div>
        <div className="surface-card p-6">
          <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Printer className="h-4 w-4 text-primary" aria-hidden />
            Accès aux impressions
          </p>
          <p className="mt-2 font-display text-3xl font-extrabold">
            {autorises}
            <span className="ml-1 text-base font-semibold text-muted-foreground">
              / {users.length}
            </span>
          </p>
        </div>
      </div>

      {/* Sans liste blanche, « Autorisé » partout n'est pas un choix fait
          compte par compte : c'est le repli. Le dire évite de croire que les
          droits sont réglés alors qu'ils sont simplement ouverts. */}
      <div
        className={cn(
          'surface-card p-6 text-sm',
          printRestricted ? 'bg-secondary/40' : 'border-amber-500/30 bg-amber-500/5',
        )}
      >
        <p className="font-medium">
          {printRestricted
            ? 'L’accès aux impressions est restreint à une liste d’adresses.'
            : 'Tous les comptes admin ont accès aux impressions.'}
        </p>
        <p className="mt-1 text-muted-foreground">
          {printRestricted ? (
            <>
              Seules les adresses listées dans <code>PRINT_ADMIN_EMAILS</code> ouvrent la section
              Impressions — celle qui donne accès aux documents des clients et permet de révoquer
              un point d’impression.
            </>
          ) : (
            <>
              <code>PRINT_ADMIN_EMAILS</code> est vide : c’est le comportement de repli, jamais un
              refus silencieux. Pour restreindre, listez les adresses autorisées, séparées par des
              virgules.
            </>
          )}
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          Ce droit se règle dans les variables d’environnement de l’hébergement, pas depuis cet
          écran : il n’est donc pas modifiable ici. Après modification, le site doit être
          redéployé pour que la nouvelle liste s’applique.
        </p>
      </div>

      {unknownAllowedEmails.length > 0 && (
        <div className="surface-card border-amber-500/30 bg-amber-500/5 p-6 text-sm">
          <p className="flex items-center gap-2 font-medium text-amber-700">
            <AlertTriangle className="h-4 w-4" aria-hidden />
            {unknownAllowedEmails.length === 1
              ? 'Une adresse autorisée ne correspond à aucun compte'
              : `${unknownAllowedEmails.length} adresses autorisées ne correspondent à aucun compte`}
          </p>
          <ul className="mt-2 space-y-1">
            {unknownAllowedEmails.map((email) => (
              <li key={email} className="font-mono text-xs break-all">
                {email}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">
            Presque toujours une faute de frappe dans <code>PRINT_ADMIN_EMAILS</code>, qui prive
            quelqu’un de son accès sans rien signaler.
          </p>
        </div>
      )}

      <div className="surface-card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-secondary/60 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Compte</th>
              <th className="px-4 py-3 font-medium">Impressions</th>
              <th className="px-4 py-3 font-medium">Dernière connexion</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">Créé le</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                  Aucun compte admin pour le moment.
                </td>
              </tr>
            )}

            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-4 py-3">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{user.name}</span>
                    {user.id === currentUserId && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                        vous
                      </span>
                    )}
                    {!user.emailConfirmed && (
                      <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-700">
                        adresse non confirmée
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-xs break-all text-muted-foreground">
                    {user.email || '—'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <BadgeImpression autorise={user.canPrint} />
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatDepuis(user.lastSignInAt)}
                  {user.lastSignInAt && (
                    <span className="mt-0.5 block text-xs">
                      {formatDateIso(user.lastSignInAt)}
                    </span>
                  )}
                </td>
                <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                  {formatDateIso(user.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
