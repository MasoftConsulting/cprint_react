'use client'

import { useFormStatus } from 'react-dom'

export function UnassignButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm('Retirer cette machine du site ?')) event.preventDefault()
      }}
      className="text-xs font-medium text-red-600 hover:underline disabled:opacity-60"
    >
      {pending ? 'Retrait…' : 'Retirer'}
    </button>
  )
}
