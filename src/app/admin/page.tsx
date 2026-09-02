import type { Metadata } from 'next'
import { Printer } from 'lucide-react'

import { LoginForm } from '@/features/auth/components/login-form'

export const metadata: Metadata = {
  title: 'Connexion Admin',
  robots: { index: false, follow: false },
}

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40 p-4">
      <div className="surface-card grid w-full max-w-4xl overflow-hidden shadow-[var(--shadow-elegant)] md:grid-cols-2">
        <div className="flex flex-col justify-center p-8 sm:p-10">
          <div className="mb-8 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground">
              <Printer className="h-6 w-6" aria-hidden />
            </span>
            <div>
              <p className="font-display text-lg leading-tight font-bold">Campus Print</p>
              <p className="text-xs font-medium text-muted-foreground">Espace Admin — by MaSoft</p>
            </div>
          </div>

          <h1 className="font-display text-2xl font-extrabold">Connexion</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Entrez vos identifiants pour accéder au tableau de bord.
          </p>

          <LoginForm />
        </div>

        <div className="relative hidden bg-[image:var(--gradient-hero)] bg-cover bg-center md:block">
          <div className="flex h-full flex-col justify-end p-8 text-primary-foreground">
            <p className="font-display text-xl font-bold">Gérez vos points d&apos;impression</p>
            <p className="mt-2 text-sm text-primary-foreground/80">
              Suivez les commandes, les tarifs et les campus connectés depuis un seul endroit.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
