import type { Metadata } from 'next'
import { Outfit, Plus_Jakarta_Sans } from 'next/font/google'

import './globals.css'
import { MARQUE } from '@/lib/marque'

// Polices auto-hébergées : pas de requête vers Google, pas de décalage de police.
const outfit = Outfit({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-outfit',
  display: 'swap',
})

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jakarta',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: `${MARQUE.nom} ${MARQUE.signature} — Impression en libre-service`,
    template: `%s — ${MARQUE.nom} ${MARQUE.signature}`,
  },
  description:
    'Envoyez votre document depuis votre téléphone, payez en Mobile Money, par carte ou PayPal, et récupérez votre impression en quelques minutes dans le point Print de votre choix.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${outfit.variable} ${jakarta.variable}`}>
      <body>{children}</body>
    </html>
  )
}
