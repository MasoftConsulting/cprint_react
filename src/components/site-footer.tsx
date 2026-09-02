import Link from 'next/link'
import { cacheLife } from 'next/cache'
import { Mail, MapPin, Phone, Printer } from 'lucide-react'

import { getContactInfo } from '@/features/settings/queries'

/**
 * L'horloge est une donnée dynamique : sous Cache Components elle doit être lue
 * dans une portée mise en cache, sinon le prérendu échoue.
 */
async function getCurrentYear(): Promise<number> {
  'use cache'
  cacheLife('days')
  return new Date().getFullYear()
}

export async function SiteFooter() {
  const [contact, year] = await Promise.all([getContactInfo(), getCurrentYear()])

  return (
    <footer className="mt-24 border-t border-border bg-secondary/60">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground">
              <Printer className="h-5 w-5" aria-hidden />
            </span>
            <span className="font-display font-bold">Campus Print</span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            L&apos;impression en libre-service sur votre campus. Un service MaSoft Consulting,
            partenaire agréé Sharp.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold">Le service</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link href="/comment-ca-marche" className="hover:text-primary">
                Comment ça marche
              </Link>
            </li>
            <li>
              <Link href="/tarifs" className="hover:text-primary">
                Tarifs
              </Link>
            </li>
            <li>
              <Link href="/points" className="hover:text-primary">
                Points Campus Print
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold">MaSoft Consulting</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link href="/universites" className="hover:text-primary">
                Pour les universités
              </Link>
            </li>
            <li>
              <Link href="/a-propos" className="hover:text-primary">
                À propos
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-primary">
                Contact
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold">Nous joindre</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary" aria-hidden />
              {contact.phone}
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" aria-hidden />
              {contact.email}
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" aria-hidden />
              {contact.address}
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border/70 py-5 text-center text-xs text-muted-foreground">
        © {year} Campus Print by MaSoft Consulting
      </div>
    </footer>
  )
}
