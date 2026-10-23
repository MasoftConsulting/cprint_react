import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { CardsSkeleton } from '@/components/ui/skeletons'
import { requireUser } from '@/lib/dal'
import { getPricing } from '@/features/settings/queries'
import { PricingForm } from '@/features/settings/components/pricing-form'

export const metadata: Metadata = {
  title: 'Tarifs',
}

async function PricingFormLoader() {
  await requireUser()
  const pricing = await getPricing()

  return (
    <PricingForm
      priceNb={pricing.nb}
      priceCouleur={pricing.couleur}
      priceLivret={pricing.livret}
      eur={pricing.eur}
    />
  )
}

export default function AdminPricingPage() {
  return (
    <>
      <p className="text-sm text-muted-foreground">
        Ces prix s&apos;affichent automatiquement sur la page publique{' '}
        <Link href="/tarifs" className="text-primary hover:underline" target="_blank">
          Tarifs
        </Link>{' '}
        et dans le simulateur de prix, et ce sont eux que la centrale débite.
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        La zone est celle du <strong>point où l&apos;on imprime</strong>, d&apos;après le pays du
        site. Un code s&apos;imprime partout : payé dans la zone la plus chère, il sort ailleurs
        sans remboursement ; payé dans la moins chère, la borne d&apos;un point plus cher fait
        régler la différence (ajustement tarifaire) avant d&apos;imprimer.
      </p>

      <div className="mt-6">
        <Suspense fallback={<CardsSkeleton count={2} className="h-52" />}>
          <PricingFormLoader />
        </Suspense>
      </div>
    </>
  )
}
