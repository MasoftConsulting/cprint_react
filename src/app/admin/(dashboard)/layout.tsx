import { Suspense } from 'react'
import type { Metadata } from 'next'

import { FlashToast } from '@/components/flash-toast'
import { requireUser } from '@/lib/dal'
import { AdminShell } from '@/features/auth/components/admin-shell'

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
}

// Tout l'espace admin dépend de la session : il n'y a pas de coquille statique
// à prérendre, ces routes bloquent volontairement sur le serveur.
export const instant = false

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // La session est revérifiée ici, pas seulement dans `proxy.ts`.
  const user = await requireUser()

  return (
    <AdminShell user={user}>
      <Suspense fallback={null}>
        <FlashToast />
      </Suspense>
      {children}
    </AdminShell>
  )
}
