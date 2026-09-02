import { z } from 'zod'

export const loginSchema = z.object({
  email: z.email('Adresse e-mail invalide.'),
  password: z.string().min(1, 'Champ obligatoire.'),
})

export const profileSchema = z
  .object({
    name: z.string().trim().min(1, 'Champ obligatoire.').max(255),
    email: z.email('Adresse e-mail invalide.').max(255),
    current_password: z.string().optional(),
    password: z.string().optional(),
    password_confirmation: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.password) return

    if (data.password.length < 8) {
      ctx.addIssue({
        code: 'custom',
        path: ['password'],
        message: 'Le mot de passe doit contenir au moins 8 caractères.',
      })
    }
    if (data.password !== data.password_confirmation) {
      ctx.addIssue({
        code: 'custom',
        path: ['password_confirmation'],
        message: 'La confirmation ne correspond pas.',
      })
    }
    if (!data.current_password) {
      ctx.addIssue({
        code: 'custom',
        path: ['current_password'],
        message: 'Indiquez votre mot de passe actuel pour le changer.',
      })
    }
  })

export type LoginInput = z.infer<typeof loginSchema>
export type ProfileInput = z.infer<typeof profileSchema>
