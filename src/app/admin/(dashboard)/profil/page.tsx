import type { Metadata } from 'next'

import { requireUser } from '@/lib/dal'
import { ProfileForm } from '@/features/auth/components/profile-form'

export const metadata: Metadata = {
  title: 'Mon profil',
}

export default async function AdminProfilePage() {
  const user = await requireUser()

  return <ProfileForm name={user.name} email={user.email} />
}
