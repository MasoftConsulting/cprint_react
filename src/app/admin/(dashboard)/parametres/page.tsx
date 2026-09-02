import type { Metadata } from 'next'

import { requireUser } from '@/lib/dal'
import { getSettings } from '@/features/settings/queries'
import { SiteSettingsForm } from '@/features/settings/components/site-settings-form'

export const metadata: Metadata = {
  title: 'Paramètres du site',
}

export default async function AdminSettingsPage() {
  await requireUser()
  const settings = await getSettings()

  return <SiteSettingsForm settings={settings} />
}
