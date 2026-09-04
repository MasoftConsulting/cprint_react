'use client'

import { useFormStatus } from 'react-dom'

export function DeleteFaqButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm('Supprimer cette question ?')) event.preventDefault()
      }}
      className="ml-3 font-medium text-red-600 hover:underline disabled:opacity-60"
    >
      {pending ? 'Suppression…' : 'Supprimer'}
    </button>
  )
}
