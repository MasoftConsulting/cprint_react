'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'

import { requireUser } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { type FormState } from '@/lib/form-state'
import { loginSchema, profileSchema } from '@/features/auth/schema'

export async function login(_prevState: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return { status: 'error', errors: z.flattenError(parsed.error).fieldErrors }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)

  if (error) {
    // Message volontairement générique : il ne doit pas révéler si l'adresse existe.
    return { status: 'error', message: 'Identifiant ou mot de passe incorrect.' }
  }

  redirect('/admin/dashboard')
}

export async function logout(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/admin')
}

export async function updateProfile(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser()

  const parsed = profileSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    current_password: formData.get('current_password') || undefined,
    password: formData.get('password') || undefined,
    password_confirmation: formData.get('password_confirmation') || undefined,
  })
  if (!parsed.success) {
    return { status: 'error', errors: z.flattenError(parsed.error).fieldErrors }
  }

  const supabase = await createClient()
  const { name, email, password, current_password: currentPassword } = parsed.data

  // Supabase ne vérifie pas le mot de passe actuel : on le fait nous-mêmes en
  // rejouant une authentification avant d'autoriser le changement.
  if (password && currentPassword) {
    const { error } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    })
    if (error) {
      return {
        status: 'error',
        errors: { current_password: ['Le mot de passe actuel est incorrect.'] },
      }
    }
  }

  const { error } = await supabase.auth.updateUser({
    email,
    data: { name },
    ...(password ? { password } : {}),
  })

  if (error) {
    return { status: 'error', message: error.message }
  }

  const emailChanged = email !== user.email
  return {
    status: 'success',
    message: emailChanged
      ? 'Profil mis à jour. Confirmez la nouvelle adresse depuis l’e-mail reçu.'
      : 'Profil mis à jour.',
  }
}
