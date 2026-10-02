import { Suspense } from 'react'
import type { Metadata } from 'next'

import { CardsSkeleton } from '@/components/ui/skeletons'
import { requireUser } from '@/lib/dal'
import { UsersBoard } from '@/features/utilisateurs/components/users-board'
import { getBoardUsers } from '@/features/utilisateurs/queries'

export const metadata: Metadata = {
  title: 'Utilisateurs',
}

async function UsersList() {
  // Comme toute page d'admin : la session est revérifiée ici, la navigation
  // qui y mène ne prouve rien (voir lib/dal.ts et src/proxy.ts).
  const current = await requireUser()
  const result = await getBoardUsers()

  if (result.status === 'cle-absente') {
    return (
      <div className="surface-card border-amber-500/30 bg-amber-500/5 p-6 text-sm">
        <p className="font-medium text-amber-700">Liste des comptes indisponible.</p>
        <p className="mt-1 text-muted-foreground">
          Les comptes vivent dans Supabase Auth et ne se lisent qu&apos;avec la clé{' '}
          <code>SUPABASE_SERVICE_ROLE_KEY</code>, qui n&apos;est pas configurée. Renseignez-la
          dans les variables d&apos;environnement de l&apos;hébergement — jamais avec un préfixe{' '}
          <code>NEXT_PUBLIC_</code>, elle contourne toutes les règles d&apos;accès.
        </p>
      </div>
    )
  }

  if (result.status === 'erreur') {
    return (
      <div className="surface-card border-destructive/30 bg-destructive/5 p-6">
        <p className="font-medium text-destructive">{result.message}</p>
      </div>
    )
  }

  return (
    <UsersBoard
      users={result.users}
      printRestricted={result.printRestricted}
      unknownAllowedEmails={result.unknownAllowedEmails}
      currentUserId={current.id}
    />
  )
}

export default function UtilisateursPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-extrabold sm:text-3xl">Utilisateurs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Les comptes qui peuvent ouvrir le back-office, et lesquels ont accès à la section
          Impressions.
        </p>
      </header>

      <Suspense fallback={<CardsSkeleton />}>
        <UsersList />
      </Suspense>
    </div>
  )
}
