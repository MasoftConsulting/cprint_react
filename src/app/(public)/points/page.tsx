import type { Metadata } from 'next'

import { CtaBand } from '@/components/cta-band'
import { PointsDirectory } from '@/features/print-points/components/points-directory'
import { getPrintPointsWithMachines } from '@/features/print-points/queries'

export const metadata: Metadata = {
  title: 'Points Campus Print — Campus partenaires au Togo',
  description:
    'Découvrez les bornes Campus Print installées sur les campus universitaires togolais : Lomé, Kara, Sokodé et Atakpamé.',
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
