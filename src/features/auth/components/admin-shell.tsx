'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CreditCard, FileText, MapPin, Menu, Printer, Server, Settings2, Zap } from 'lucide-react'

import { cn } from '@/lib/cn'
import type { AdminUser } from '@/lib/dal'
import { logout } from '@/features/auth/actions'

const NAV_LINKS = [
  { href: '/admin/dashboard', label: 'Tableau de bord', Icon: Settings2 },
  { href: '/admin/points', label: 'Sites Campus', Icon: MapPin },
  { href: '/admin/machines', label: 'Machines', Icon: Server },
  { href: '/admin/tarifs', label: 'Tarifs', Icon: CreditCard },
  { href: '/admin/parametres', label: 'Paramètres', Icon: Zap },
]

/** Titre affiché dans l'en-tête, dérivé de l'URL (équivalent de `@section('page-title')`). */
function resolvePageTitle(pathname: string): string {
  if (pathname === '/admin/points/nouveau') return "Ajouter un site d'impression"
  if (pathname.startsWith('/admin/points/')) return "Modifier le site d'impression"
  if (pathname.startsWith('/admin/points')) return "Sites d'impression"
  if (pathname === '/admin/machines/nouveau') return 'Ajouter une machine'
  if (pathname.startsWith('/admin/machines/')) return 'Modifier la machine'
  if (pathname.startsWith('/admin/machines')) return 'Parc de machines'
  if (pathname.startsWith('/admin/tarifs')) return 'Tarifs'
  if (pathname.startsWith('/admin/parametres')) return 'Paramètres du site'
  if (pathname.startsWith('/admin/profil')) return 'Mon profil'
  return 'Tableau de bord'
}

export function AdminShell({
  user,
  children,
}: {
  // Projection explicite : aucun objet brut de la base ne traverse la frontière client.
  user: AdminUser
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const pageTitle = resolvePageTitle(pathname)

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  return (
    <div className="min-h-screen bg-secondary/40">
      <div className="flex min-h-screen">
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          />
        )}

        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-40 w-64 bg-[image:var(--gradient-hero)] text-primary-foreground transition-transform duration-200 lg:relative lg:translate-x-0',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="flex h-16 items-center gap-2 px-6">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
              <Printer className="h-5 w-5" aria-hidden />
            </span>
            <span className="font-display text-base font-bold">Campus Print</span>
          </div>

          <nav className="mt-4 space-y-1 px-3">
            {NAV_LINKS.map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  pathname.startsWith(href)
                    ? 'bg-white/15'
                    : 'text-primary-foreground/70 hover:bg-white/10',
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </Link>
            ))}

            <span className="flex cursor-not-allowed items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-primary-foreground/40">
              <span className="flex items-center gap-3">
                <FileText className="h-4 w-4" aria-hidden />
                Commandes
              </span>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold">
                Bientôt
              </span>
            </span>
          </nav>

          <form action={logout} className="absolute inset-x-3 bottom-4">
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 px-3 py-2.5 text-sm font-medium text-primary-foreground/80 transition-colors hover:bg-white/10"
            >
              Déconnexion
            </button>
          </form>
        </aside>

        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/85 px-4 backdrop-blur sm:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen((open) => !open)}
                aria-label="Menu"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-border lg:hidden"
              >
                <Menu className="h-5 w-5" aria-hidden />
              </button>
              <h1 className="font-display text-lg font-bold">{pageTitle}</h1>
            </div>

            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileOpen((open) => !open)}
                className="flex items-center gap-3"
              >
                <div className="hidden text-right sm:block">
                  <p className="text-sm leading-tight font-medium">{user.name}</p>
                  <p className="text-xs leading-tight text-muted-foreground">{user.email}</p>
                </div>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </button>

              {profileOpen && (
                <div className="absolute top-full right-0 z-30 mt-2 w-52 overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
                  <div className="border-b border-border px-4 py-3">
                    <p className="text-sm leading-tight font-medium">{user.name}</p>
                    <p className="text-xs leading-tight text-muted-foreground">{user.email}</p>
                  </div>
                  <Link
                    href="/admin/profil"
                    onClick={() => setProfileOpen(false)}
                    className="block px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent"
                  >
                    Profil
                  </Link>
                  <form action={logout}>
                    <button
                      type="submit"
                      className="block w-full px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-accent"
                    >
                      Déconnexion
                    </button>
                  </form>
                </div>
              )}
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </div>
  )
}
