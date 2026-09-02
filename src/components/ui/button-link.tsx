import Link from 'next/link'

import { cn } from '@/lib/cn'

type Variant = 'cta' | 'soft' | 'light'

const VARIANTS: Record<Variant, string> = {
  cta: 'bg-cta text-cta-foreground shadow-[var(--shadow-cta)] hover:brightness-105 active:scale-[0.98]',
  soft: 'bg-primary/10 text-primary hover:bg-primary/15',
  light: 'bg-background text-primary shadow-sm hover:bg-background/90',
}

export function ButtonLink({
  href,
  variant = 'cta',
  className,
  children,
}: {
  href: string
  variant?: Variant
  className?: string
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex h-14 items-center justify-center gap-2 rounded-xl px-8 text-base font-medium whitespace-nowrap transition-colors',
        VARIANTS[variant],
        className,
      )}
    >
      {children}
    </Link>
  )
}
