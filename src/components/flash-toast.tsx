'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

/**
 * Remplace les toasts SweetAlert2 du projet Laravel : les Server Actions
 * redirigent avec `?flash=…` après une mutation réussie.
 */
const MESSAGES: Record<string, string> = {
  created: "Point d'impression ajouté avec succès.",
  updated: "Point d'impression mis à jour.",
  deleted: "Point d'impression supprimé.",
}

function Toast({ message }: { message: string }) {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setHidden(true), 2500)
    return () => clearTimeout(timer)
  }, [])

  if (hidden) return null

  return (
    <div
      role="status"
      className="fixed top-4 right-4 z-50 rounded-xl bg-success px-4 py-3 text-sm font-medium text-success-foreground shadow-[var(--shadow-card)]"
    >
      {message}
    </div>
  )
}

export function FlashToast() {
  const flash = useSearchParams().get('flash')
  const message = flash ? MESSAGES[flash] : undefined

  if (!message) return null

  // La `key` remonte un toast neuf — et donc un nouveau minuteur — à chaque flash.
  return <Toast key={flash} message={message} />
}
