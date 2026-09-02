import { Suspense } from 'react'
import type { Metadata } from 'next'
import { Clock, CreditCard, FileText, MapPin, Smartphone } from 'lucide-react'

import { requireUser } from '@/lib/dal'
import { createAdminClient } from '@/lib/supabase/admin'
import { getActivePrintPointsCount } from '@/features/print-points/queries'

export const metadata: Metadata = {
  title: 'Tableau de bord',
}

/** Nombre de comptes Supabase Auth — nécessite la clé de service. */
async function countUsers(): Promise<number | null> {
  const supabase = createAdminClient()
  if (!supabase) return null

  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 })
  if (error) return null
  return data.total ?? data.users.length
}

async function StatCards() {
  const [activePoints, users] = await Promise.all([getActivePrintPointsCount(), countUsers()])

  const stats = [
    { Icon: FileText, label: 'Commandes du jour', value: '—' },
    { Icon: CreditCard, label: "Chiffre d'affaires", value: '0 FCFA' },
    { Icon: MapPin, label: 'Points actifs', value: activePoints },
    { Icon: Smartphone, label: 'Utilisateurs', value: users ?? '—' },
  ]

  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map(({ Icon, label, value }) => (
        <div key={label} className="surface-card p-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" aria-hidden />
          </span>
          <p className="mt-4 font-display text-2xl font-extrabold text-foreground">{value}</p>
          <p className="mt-1 text-sm text-muted-foreground">{label}</p>
        </div>
      ))}
    </div>
  )
}

function StatCardsSkeleton() {
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[0, 1, 2, 3].map((index) => (
        <div key={index} className="surface-card h-36 animate-pulse p-5" />
      ))}
    </div>
  )
}

export default async function DashboardPage() {
  const user = await requireUser()

  return (
    <>
      <div className="surface-card bg-[image:var(--gradient-primary)] p-6 text-primary-foreground sm:p-8">
        <p className="font-display text-xl font-bold sm:text-2xl">Bienvenue, {user.name} 👋</p>
        <p className="mt-1 text-sm text-primary-foreground/80">
          Voici l&apos;espace d&apos;administration de Campus Print. Les modules ci-dessous seront
          connectés à mesure que le back-office avance.
        </p>
      </div>

      {/* Les compteurs interrogent Supabase : ils sont streamés pour ne pas retarder la page. */}
      <Suspense fallback={<StatCardsSkeleton />}>
        <StatCards />
      </Suspense>

      <div className="surface-card mt-6 p-6 sm:p-8">
        <h2 className="font-display text-lg font-bold">Activité récente</h2>

        <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
            <Clock className="h-6 w-6 text-muted-foreground" aria-hidden />
          </span>
          <p className="mt-4 font-medium">Aucune donnée pour l&apos;instant</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Les commandes, points d&apos;impression et statistiques apparaîtront ici une fois le
            back-office branché sur cette interface.
          </p>
        </div>
      </div>
    </>
  )
}
