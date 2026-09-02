'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Copy, FileText, Palette } from 'lucide-react'

import { cn } from '@/lib/cn'

type ColorMode = 'nb' | 'couleur'

type Props = {
  priceNb: number
  priceCouleur: number
}

/**
 * Le champ garde la saisie brute (une chaîne) plutôt qu'un nombre : sinon,
 * ramener la valeur à 1 à chaque frappe empêche d'effacer le champ pour saisir
 * un autre nombre — on ne pourrait qu'ajouter des chiffres à la fin.
 * Les boutons + / − travaillent, eux, sur la valeur numérique bornée à 1.
 */
function toNumber(raw: string): number {
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

function Stepper({
  label,
  icon,
  raw,
  onChange,
}: {
  label: string
  icon: React.ReactNode
  raw: string
  onChange: (next: string) => void
}) {
  const value = toNumber(raw)

  return (
    <div>
      <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        {icon}
        {label}
      </label>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(String(Math.max(1, value - 1)))}
          aria-label={`Diminuer ${label}`}
          className="h-12 w-12 shrink-0 rounded-xl border border-border text-xl font-semibold transition-colors hover:bg-accent"
        >
          −
        </button>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          value={raw}
          onChange={(event) => onChange(event.target.value)}
          // Un champ laissé vide revient à 1 quand l'utilisateur en sort.
          onBlur={() => onChange(String(Math.max(1, value)))}
          aria-label={label}
          className="h-12 w-full rounded-xl border border-border bg-background text-center text-lg font-semibold outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={() => onChange(String(value + 1))}
          aria-label={`Augmenter ${label}`}
          className="h-12 w-12 shrink-0 rounded-xl border border-border text-xl font-semibold transition-colors hover:bg-accent"
        >
          +
        </button>
      </div>
    </div>
  )
}

export function PriceCalculator({ priceNb, priceCouleur }: Props) {
  const [pagesRaw, setPagesRaw] = useState('10')
  const [copiesRaw, setCopiesRaw] = useState('1')
  const [color, setColor] = useState<ColorMode>('nb')

  const pages = toNumber(pagesRaw)
  const copies = toNumber(copiesRaw)
  const unitPrice = color === 'nb' ? priceNb : priceCouleur
  const total = pages * copies * unitPrice

  return (
    <div className="surface-card p-5 sm:p-7">
      <h3 className="font-display text-xl font-bold">Estimez votre impression</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Une simulation instantanée, sans engagement.
      </p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <Stepper
          label="Nombre de pages"
          icon={<FileText className="h-4 w-4 text-primary" aria-hidden />}
          raw={pagesRaw}
          onChange={setPagesRaw}
        />
        <Stepper
          label="Nombre de copies"
          icon={<Copy className="h-4 w-4 text-primary" aria-hidden />}
          raw={copiesRaw}
          onChange={setCopiesRaw}
        />
      </div>

      <div className="mt-5">
        <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Palette className="h-4 w-4 text-primary" aria-hidden />
          Couleur d&apos;impression
        </span>
        <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-secondary p-1.5">
          <button
            type="button"
            onClick={() => setColor('nb')}
            aria-pressed={color === 'nb'}
            className={cn(
              'rounded-lg px-3 py-3 text-sm font-semibold transition-colors',
              color === 'nb'
                ? 'bg-card text-primary shadow-[var(--shadow-card)]'
                : 'text-muted-foreground',
            )}
          >
            Noir &amp; Blanc
            <span className="block text-xs font-normal">{priceNb} FCFA/page</span>
          </button>
          <button
            type="button"
            onClick={() => setColor('couleur')}
            aria-pressed={color === 'couleur'}
            className={cn(
              'rounded-lg px-3 py-3 text-sm font-semibold transition-colors',
              color === 'couleur'
                ? 'bg-card text-primary shadow-[var(--shadow-card)]'
                : 'text-muted-foreground',
            )}
          >
            Couleur
            <span className="block text-xs font-normal">{priceCouleur} FCFA/page</span>
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-3 rounded-xl bg-[image:var(--gradient-primary)] p-5 text-primary-foreground">
        <div>
          <p className="text-sm opacity-80">Total estimé</p>
          <p className="font-display text-4xl font-extrabold">
            {total} <span className="text-xl">FCFA</span>
          </p>
        </div>
        <p className="text-sm opacity-80">
          {pages} page{pages > 1 ? 's' : ''} × {copies} copie{copies > 1 ? 's' : ''}
        </p>
      </div>

      <Link
        href="/points"
        className="mt-4 inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-cta px-8 text-base font-medium whitespace-nowrap text-cta-foreground shadow-[var(--shadow-cta)] transition-colors hover:brightness-105 active:scale-[0.98]"
      >
        Imprimer un document
      </Link>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        Prix indicatif — le paiement s&apos;effectue au moment de l&apos;envoi de votre document.
      </p>
    </div>
  )
}
