import { Suspense } from 'react'
import type { Metadata } from 'next'

import { CardsSkeleton } from '@/components/ui/skeletons'
import { requireUser } from '@/lib/dal'
import { ProfileForm } from '@/features/auth/components/profile-form'

export const metadata: Metadata = {
  title: 'Mon profil',
}

async function ProfileFormLoader() {
  const user = await requireUser()

  return <ProfileForm name={user.name} email={user.email} />
}

export default function AdminProfilePage() {
  return (
    <Suspense fallback={<CardsSkeleton count={2} className="h-80" />}>
      <ProfileFormLoader />
    </Suspense>
  )
}
