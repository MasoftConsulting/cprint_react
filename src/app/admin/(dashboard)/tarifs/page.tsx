import type { Metadata } from 'next'
import Link from 'next/link'

import { requireUser } from '@/lib/dal'
import { getPricing } from '@/features/settings/queries'
import { PricingForm } from '@/features/settings/components/pricing-form'

export const metadata: Metadata = {
  title: 'Tarifs',
}

export default async function AdminPricingPage() {
  await requireUser()
  const pricing = await getPricing()

  return (
    <>
      <p className="text-sm text-muted-foreground">
        Ces prix s&apos;affichent automatiquement sur la page publique{' '}
        <Link href="/tarifs" className="text-primary hover:underline" target="_blank">
          Tarifs
        </Link>{' '}
        et dans le simulateur de prix.
      </p>

      <PricingForm priceNb={pricing.nb} priceCouleur={pricing.couleur} />
    </>
  )
}
