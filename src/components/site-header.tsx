'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, Printer } from 'lucide-react'

import { cn } from '@/lib/cn'

const NAV_LINKS = [
  { href: '/comment-ca-marche', label: 'Comment ça marche' },
  { href: '/tarifs', label: 'Tarifs' },
  { href: '/points', label: 'Points Campus' },
  { href: '/universites', label: 'Universités' },
  { href: '/a-propos', label: 'À propos' },
  { href: '/contact', label: 'Contact' },
]

export function SiteHeader() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link className="flex items-center gap-2" href="/">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground">
            <Printer className="h-5 w-5" aria-hidden />
          </span>
          <span className="font-display text-base leading-tight font-bold">
            Campus Print
            <span className="block text-[11px] font-medium text-muted-foreground">by MaSoft</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
                pathname === link.href ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/tarifs"
            className="hidden h-10 items-center justify-center gap-2 rounded-xl bg-cta px-5 text-sm font-medium whitespace-nowrap text-cta-foreground shadow-[var(--shadow-cta)] transition-colors hover:brightness-105 active:scale-[0.98] sm:inline-flex"
          >
            Imprimer un document
          </Link>
          <button
            type="button"
            onClick={() => setMobileNavOpen((open) => !open)}
            aria-label="Menu"
            aria-expanded={mobileNavOpen}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border lg:hidden"
          >
            <Menu className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </div>

      {mobileNavOpen && (
        <div className="border-t border-border bg-background lg:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileNavOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/tarifs"
              onClick={() => setMobileNavOpen(false)}
              className="mt-2 inline-flex h-11 items-center justify-center rounded-xl bg-cta px-5 text-sm font-medium text-cta-foreground shadow-[var(--shadow-cta)]"
            >
              Imprimer un document
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}
