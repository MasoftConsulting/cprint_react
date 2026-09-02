import type { Metadata } from 'next'
import Link from 'next/link'

import { cn } from '@/lib/cn'
import { requireUser } from '@/lib/dal'
import { deletePrintPoint } from '@/features/print-points/actions'
import { getPrintPoints } from '@/features/print-points/queries'
import { statusLabel } from '@/features/print-points/schema'
import { DeletePointButton } from '@/features/print-points/components/delete-point-button'

export const metadata: Metadata = {
  title: "Points d'impression",
}

export default async function AdminPointsPage() {
  await requireUser()
  const printPoints = await getPrintPoints()

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Gère les bornes Campus Print installées sur les campus.
        </p>
        <Link
          href="/admin/points/nouveau"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cta px-5 text-sm font-medium whitespace-nowrap text-cta-foreground hover:brightness-105"
        >
          + Ajouter un point d&apos;impression
        </Link>
      </div>

      <div className="surface-card mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-secondary/60 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Nom</th>
              <th className="px-4 py-3 font-medium">Emplacement</th>
              <th className="px-4 py-3 font-medium">Horaires</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {printPoints.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  Aucun point pour le moment.
                </td>
              </tr>
            )}

            {printPoints.map((point) => (
              <tr key={point.id}>
                <td className="px-4 py-3 font-medium">{point.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{point.location}</td>
                <td className="px-4 py-3 text-muted-foreground">{point.hours}</td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-semibold',
                      point.status === 'actif'
                        ? 'bg-success/10 text-success'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {statusLabel(point.status)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <Link
                    href={`/admin/points/${point.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    Modifier
                  </Link>
                  <form action={deletePrintPoint} className="inline">
                    <input type="hidden" name="id" value={point.id} />
                    <DeletePointButton />
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
