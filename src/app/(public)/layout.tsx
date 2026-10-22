import { Suspense } from 'react'

import { ToastProvider } from '@/components/ui/toast'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { SelecteurDeviseSquelette } from '@/features/devise/components/devise-client'
import { SelecteurDeviseServeur } from '@/features/devise/components/devise-serveur'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="flex min-h-screen flex-col">
        {/* Le sélecteur lit le cookie et le pays du visiteur : sous Suspense,
            pour que le reste de chaque page publique reste prérendu. */}
        <SiteHeader
          selecteurDevise={
            <Suspense fallback={<SelecteurDeviseSquelette />}>
              <SelecteurDeviseServeur />
            </Suspense>
          }
        />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </div>
    </ToastProvider>
  )
}
