'use client'

import { useFormStatus } from 'react-dom'

export function ToggleReadButton({ lu }: { lu: boolean }) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="text-xs font-medium text-primary hover:underline disabled:opacity-60"
    >
      {pending ? '…' : lu ? 'Marquer non lu' : 'Marquer lu'}
    </button>
  )
}

export function DeleteMessageButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm('Supprimer ce message ?')) event.preventDefault()
      }}
      className="text-xs font-medium text-red-600 hover:underline disabled:opacity-60"
    >
      {pending ? 'Suppression…' : 'Supprimer'}
    </button>
  )
}
