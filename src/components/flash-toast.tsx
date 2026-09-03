'use client'

import { useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import { useToast } from '@/components/ui/toast'

/**
 * Remplace les toasts SweetAlert2 du projet Laravel : les Server Actions
 * redirigent avec `?flash=…` après une mutation réussie.
 */
const MESSAGES: Record<string, { title: string; description: string }> = {
  created: { title: 'Enregistrement ajouté', description: 'La fiche a bien été créée.' },
  updated: { title: 'Modifications enregistrées', description: 'La fiche a bien été mise à jour.' },
  deleted: { title: 'Enregistrement supprimé', description: 'La fiche a bien été supprimée.' },
  assigned: { title: 'Machine affectée', description: 'La machine est désormais installée sur ce site.' },
  unassigned: { title: 'Affectation retirée', description: 'La machine redevient disponible.' },
}

export function FlashToast() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()
  // Un même flash ne doit pas être rejoué si le composant se remonte.
  const shown = useRef<string | null>(null)

  const flash = searchParams.get('flash')

  useEffect(() => {
    if (!flash || shown.current === flash) return
    const message = MESSAGES[flash]
    if (!message) return

    shown.current = flash
    toast({ variant: 'success', ...message })

    // On retire `?flash=` de l'URL : un rafraîchissement ne doit pas
    // réafficher une notification pour une action déjà passée.
    router.replace(window.location.pathname, { scroll: false })
  }, [flash, toast, router])

  return null
}
