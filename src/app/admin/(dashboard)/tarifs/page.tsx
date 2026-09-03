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

  return <PricingForm priceNb={pricing.nb} priceCouleur={pricing.couleur} />
}

export default function AdminPricingPage() {
  return (
    <>
      <p className="text-sm text-muted-foreground">
        Ces prix s&apos;affichent automatiquement sur la page publique{' '}
        <Link href="/tarifs" className="text-primary hover:underline" target="_blank">
          Tarifs
        </Link>{' '}
        et dans le simulateur de prix.
      </p>

      <div className="mt-6">
        <Suspense fallback={<CardsSkeleton count={2} className="h-52" />}>
          <PricingFormLoader />
        </Suspense>
      </div>
    </>
  )
}
