import type { Metadata } from 'next'
import Link from 'next/link'

import { cn } from '@/lib/cn'
import { requireUser } from '@/lib/dal'
import { deletePrintPoint } from '@/features/print-points/actions'
import { getPrintPointsWithMachines } from '@/features/print-points/queries'
import { formatSiteAddress, statusLabel } from '@/features/print-points/schema'
import { DeletePointButton } from '@/features/print-points/components/delete-point-button'

export const metadata: Metadata = {
  title: "Sites d'impression",
}

export default async function AdminPointsPage() {
  await requireUser()
  const sites = await getPrintPointsWithMachines()

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Campus et lieux où Campus Print est installé.
        </p>
        <Link
          href="/admin/points/nouveau"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cta px-5 text-sm font-medium whitespace-nowrap text-cta-foreground hover:brightness-105"
        >
          + Ajouter un site
        </Link>
      </div>

      <div className="surface-card mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-secondary/60 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Site</th>
              <th className="px-4 py-3 font-medium">Adresse</th>
              <th className="px-4 py-3 font-medium">Coordonnées</th>
              <th className="px-4 py-3 font-medium">Machines</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sites.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  Aucun site pour le moment.
                </td>
              </tr>
            )}

            {sites.map((site) => (
              <tr key={site.id_site}>
                <td className="px-4 py-3 font-medium">{site.site_name}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatSiteAddress(site)}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {site.latitude !== null && site.longitude !== null ? (
                    `${site.latitude.toFixed(5)}, ${site.longitude.toFixed(5)}`
                  ) : (
                    <span className="text-destructive">Non renseignées</span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{site.machinesActives}</td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-semibold',
                      site.actif ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {statusLabel(site.actif)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <Link
                    href={`/admin/points/${site.id_site}`}
                    className="font-medium text-primary hover:underline"
                  >
                    Modifier
                  </Link>
                  <form action={deletePrintPoint} className="inline">
                    <input type="hidden" name="id_site" value={site.id_site} />
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
