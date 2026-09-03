import { Suspense } from 'react'
import type { Metadata } from 'next'

import { CardsSkeleton } from '@/components/ui/skeletons'
import { requireUser } from '@/lib/dal'
import { getSettings } from '@/features/settings/queries'
import { SiteSettingsForm } from '@/features/settings/components/site-settings-form'

export const metadata: Metadata = {
  title: 'Paramètres du site',
}

async function SettingsFormLoader() {
  await requireUser()
  const settings = await getSettings()

  return <SiteSettingsForm settings={settings} />
}

export default function AdminSettingsPage() {
  // La lecture de session est une donnée de requête : derrière une frontière
  // Suspense, elle est streamée et la navigation reste instantanée.
  return (
    <Suspense fallback={<CardsSkeleton count={3} />}>
      <SettingsFormLoader />
    </Suspense>
  )
}
