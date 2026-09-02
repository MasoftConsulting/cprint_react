import type { Metadata } from 'next'
import { Mail, MapPin, Phone } from 'lucide-react'

import { ContactForm } from '@/features/contact/components/contact-form'
import { getContactInfo } from '@/features/settings/queries'

export const metadata: Metadata = {
  title: 'Contact',
  description:
    "Une question sur le service ou un projet de partenariat campus ? Écrivez-nous, l'équipe Campus Print vous répond sous 24 h.",
}

export default async function ContactPage() {
  const contact = await getContactInfo()

  const details = [
    { Icon: Phone, label: 'Téléphone', value: contact.phone },
    { Icon: Mail, label: 'E-mail', value: contact.email },
    { Icon: MapPin, label: 'MaSoft Consulting', value: contact.address },
  ]

  return (
    <>
      <section className="bg-[image:var(--gradient-hero)] text-primary-foreground">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
          <span className="text-sm font-semibold opacity-90">Contact</span>
          <h1 className="mt-2 font-display text-3xl font-extrabold sm:text-5xl">
            Parlons de votre besoin
          </h1>
          <p className="mt-4 max-w-xl opacity-85">
            Étudiant, association ou établissement : notre équipe à Lomé vous répond sous 24 heures.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <ContactForm />

          <div className="surface-card p-6 sm:p-8">
            <h2 className="font-display text-lg font-bold">Coordonnées</h2>
            <ul className="mt-5 space-y-4 text-sm">
              {details.map(({ Icon, label, value }) => (
                <li key={label} className="flex items-start gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <div>
                    <p className="text-muted-foreground">{label}</p>
                    <p className="font-medium">{value}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  )
}
