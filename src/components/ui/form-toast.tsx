'use client'

import { useEffect, useRef } from 'react'

import { useToast } from '@/components/ui/toast'
import type { FormState } from '@/lib/form-state'

/**
 * Affiche en notification le message renvoyé par une Server Action restée sur
 * la page (mise à jour des tarifs, du profil…). Les actions qui redirigent
 * passent, elles, par `?flash=` et `<FlashToast>`.
 */
export function FormToast({ state }: { state: FormState }) {
  const { toast } = useToast()
  // `state` est recréé à chaque rendu : on ne notifie que sur un vrai changement.
  const lastShown = useRef<FormState | null>(null)

  useEffect(() => {
    if (!state.message || state.status === 'idle') return
    if (lastShown.current === state) return

    lastShown.current = state
    toast({
      variant: state.status === 'success' ? 'success' : 'error',
      title: state.status === 'success' ? 'Enregistré' : 'Échec de l’enregistrement',
      description: state.message,
    })
  }, [state, toast])

  return null
}
