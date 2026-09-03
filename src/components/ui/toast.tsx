'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'

import { cn } from '@/lib/cn'

export type ToastVariant = 'success' | 'error' | 'info'

export type Toast = {
  id: number
  variant: ToastVariant
  title: string
  description?: string
}

type ToastContextValue = {
  toast: (input: Omit<Toast, 'id'>) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

/** Durée d'affichage avant disparition automatique. */
const DISMISS_AFTER_MS = 4000

const VARIANTS: Record<
  ToastVariant,
  { Icon: typeof CheckCircle2; accent: string; iconColor: string }
> = {
  success: { Icon: CheckCircle2, accent: 'bg-success', iconColor: 'text-success' },
  error: { Icon: AlertTriangle, accent: 'bg-destructive', iconColor: 'text-destructive' },
  info: { Icon: Info, accent: 'bg-primary', iconColor: 'text-primary' },
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id))
  }, [])

  const toast = useCallback((input: Omit<Toast, 'id'>) => {
    // `Date.now()` suffit ici : deux toasts ne partent jamais dans la même milliseconde.
    setToasts((current) => [...current, { ...input, id: Date.now() + current.length }])
  }, [])

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed top-4 right-4 z-[100] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-3"
      >
        {toasts.map((item) => (
          <ToastCard key={item.id} toast={item} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const { Icon, accent, iconColor } = VARIANTS[toast.variant]

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), DISMISS_AFTER_MS)
    return () => clearTimeout(timer)
  }, [toast.id, onDismiss])

  return (
    <div
      role="status"
      className="pointer-events-auto relative flex animate-[toast-in_220ms_cubic-bezier(0.22,1,0.36,1)] overflow-hidden rounded-xl border border-border bg-card shadow-[0_10px_30px_-10px_hsl(220_15%_10%/0.35)]"
    >
      {/* Liseré coloré à gauche, comme iziToast. */}
      <span className={cn('w-1 shrink-0', accent)} aria-hidden />

      <div className="flex flex-1 items-start gap-3 p-4">
        <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', iconColor)} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{toast.title}</p>
          {toast.description && (
            <p className="mt-0.5 text-sm text-muted-foreground">{toast.description}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          aria-label="Fermer la notification"
          className="-mt-1 -mr-1 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {/* Barre de progression : reflète le délai restant avant disparition. */}
      <span
        aria-hidden
        className={cn('absolute bottom-0 left-0 h-0.5 w-full origin-left opacity-40', accent)}
        style={{ animation: `toast-progress ${DISMISS_AFTER_MS}ms linear forwards` }}
      />
    </div>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast doit être utilisé à l’intérieur de <ToastProvider>.')
  }
  return context
}
