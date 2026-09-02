'use client'

import { useFormStatus } from 'react-dom'

import { cn } from '@/lib/cn'

/**
 * `useFormStatus` ne lit l'état que d'un formulaire parent : ce bouton doit
 * donc rester un composant enfant du `<form>`, jamais le formulaire lui-même.
 */
export function SubmitButton({
  children,
  pendingLabel = 'Envoi…',
  className,
}: {
  children: React.ReactNode
  pendingLabel?: string
  className?: string
}) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        'inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-cta px-6 text-sm font-medium whitespace-nowrap text-cta-foreground shadow-[var(--shadow-cta)] transition-colors hover:brightness-105 active:scale-[0.98] disabled:opacity-70',
        className,
      )}
    >
      {pending ? pendingLabel : children}
    </button>
  )
}
