/** État partagé par tous les formulaires pilotés par `useActionState`. */
export type FormState = {
  status: 'idle' | 'success' | 'error'
  message?: string
  errors?: Record<string, string[]>
}

export const initialFormState: FormState = { status: 'idle' }
