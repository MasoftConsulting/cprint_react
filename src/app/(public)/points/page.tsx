import type { Metadata } from 'next'

import { CtaBand } from '@/components/cta-band'
import { PointsDirectory } from '@/features/print-points/components/points-directory'
import { getPrintPointsWithMachines } from '@/features/print-points/queries'
import { MARQUE } from '@/lib/marque'

export const metadata: Metadata = {
  title: `Points ${MARQUE.nom} — où imprimer`,
  description:
    `Les points ${MARQUE.nom} et l'état de leur borne, en temps réel : vérifiez qu'elle répond avant de vous déplacer.`,
}

export default async function PointsPage() {
  const printPoints = await getPrintPointsWithMachines()

  return (
    <>
      {/* L'état des bornes n'est pas lu ici : il est demandé par le navigateur
          à la centrale, comme tout le reste de cette API. La page reste donc
          entièrement prérendue, et un état en direct n'a de toute façon aucun
          sens dans une page mise en cache. */}
      <PointsDirectory points={printPoints} />
      <CtaBand />
      <div className="pb-4" />
    </>
  )
}
